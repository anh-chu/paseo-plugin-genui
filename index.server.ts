import { mkdir } from "node:fs/promises";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { checkSpec, renderReplyMarkdown } from "./shared/fallback";
import { buildFullInstructions, GENUI_MARKER } from "./shared/instructions";
import {
  appendDemoRpc,
  checkUiRpc,
  galleryAudioRpc,
  galleryDataRpc,
  galleryGetRpc,
  galleryImageRpc,
  galleryListRpc,
  loadAudioRpc,
  loadDataRpc,
  loadImageRpc,
  projectChangesRpc,
  projectCommitsRpc,
  projectEnvironmentRpc,
  projectEnvironmentsRpc,
  projectPatchesRpc,
  projectPullRequestRpc,
  projectThreadsRpc,
  renderMarkdownRpc,
  sketchFontRpc,
  uiExamplesRpc,
  webGeocodeRpc,
  webImageRpc,
  webSearchRpc,
  webTileRpc,
} from "./shared/rpc";
import { GENUI_BLOCK_KIND } from "./shared/segment";
import { genuiSettings, parseFolders } from "./shared/settings";
import {
  agentStorageDir,
  examplesReport,
  listGallery,
  loadAgentAudio,
  loadAgentFile,
  loadAgentImage,
  loadGalleryAudio,
  loadGalleryFile,
  loadGalleryImage,
  readGallerySpec,
  setExtraLoadFolders,
  sketchFontDataUrl,
} from "./server/data-source";
import {
  createProjectReader,
  readProjectChanges,
  readProjectCommits,
  readProjectEnvironment,
  readProjectEnvironments,
  readProjectPatches,
  readProjectPullRequest,
  readProjectThreads,
} from "./server/project";
import { createWebLookups } from "./server/web/lookups";

const DEFAULT_DEMO_SPEC = `$seats = 10
$plan = "Pro"
price = $plan == "Pro" ? 29 : 12
Card("Estimate", [
  Row([Choice($plan, ["Basic", "Pro"]), Slider($seats, 1, 50, label: "Seats")]),
  Metric("Total", "$" + fmt(price * $seats), note: $seats + " seats on " + $plan),
  Button("Go with " + $plan, Send("Go with " + $plan + " (" + $seats + " seats)"), variant: "primary")
])`;

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(genuiSettings);
  let webLookupsEnabled = true;

  void settings.read().then((state) => {
    if (state.status !== "ready") return;
    webLookupsEnabled = state.values.webLookups;
    setExtraLoadFolders(parseFolders(state.values.extraFolders));
  });
  const unsubscribeSettings = settings.subscribe((state) => {
    if (state.status !== "ready") return;
    webLookupsEnabled = state.values.webLookups;
    setExtraLoadFolders(parseFolders(state.values.extraFolders));
  });

  const web = createWebLookups(
    async () => {
      const current = await settings.read();
      return current.status === "ready" ? current.values.webLookups : true;
    },
    () => webLookupsEnabled,
  );

  const findImage = async (query: string) => {
    const found = await web.search(query);
    return found.ok ? found.image : null;
  };

  server.before("agent.create", async ({ request }) => {
    const current = await settings.read();
    if (current.status === "ready" && !current.values.autoInstructions) return;
    const webOn = current.status === "ready" ? current.values.webLookups : true;
    const extraFolders = current.status === "ready" ? parseFolders(current.values.extraFolders) : [];
    const existing = request.config.systemPrompt ?? "";
    if (existing.includes(GENUI_MARKER)) return;
    return {
      ...request,
      config: {
        ...request.config,
        systemPrompt: [existing, buildFullInstructions(webOn, extraFolders)].filter(Boolean).join("\n\n"),
      },
    };
  });

  server.before("agent.session_open", async ({ request }) => {
    const storageDir = agentStorageDir(request.agentId);
    await mkdir(storageDir, { recursive: true }).catch(() => undefined);
    return {
      ...request,
      env: {
        ...request.env,
        BB_THREAD_STORAGE: storageDir,
        PASEO_THREAD_STORAGE: storageDir,
      },
    };
  });

  server.handle(loadDataRpc, ({ agentId, path, raw }, { paseo }) =>
    loadAgentFile(paseo, agentId, path, { raw }),
  );
  server.handle(loadImageRpc, ({ agentId, path }, { paseo }) =>
    loadAgentImage(paseo, agentId, path),
  );
  server.handle(loadAudioRpc, ({ agentId, path }, { paseo }) =>
    loadAgentAudio(paseo, agentId, path),
  );

  server.handle(renderMarkdownRpc, async ({ agentId, text }, { paseo }) => {
    const markdown = await renderReplyMarkdown(
      text,
      (req) => loadAgentFile(paseo, agentId, req.path, req),
      findImage,
      createProjectReader(paseo, agentId),
    );
    return { markdown };
  });

  server.handle(checkUiRpc, ({ agentId, spec }, { paseo }) =>
    checkSpec(
      spec,
      (req) => loadAgentFile(paseo, agentId, req.path, req),
      findImage,
      createProjectReader(paseo, agentId),
    ),
  );

  server.handle(uiExamplesRpc, ({ components }) => examplesReport(components));

  server.handle(galleryListRpc, async () => ({ names: await listGallery() }));
  server.handle(galleryGetRpc, async ({ name }) => ({ source: await readGallerySpec(name) }));
  server.handle(galleryDataRpc, ({ path, raw }) => loadGalleryFile(path, { raw }));
  server.handle(galleryImageRpc, ({ path }) => loadGalleryImage(path));
  server.handle(galleryAudioRpc, ({ path }) => loadGalleryAudio(path));
  server.handle(sketchFontRpc, async () => ({ dataUrl: await sketchFontDataUrl() }));

  server.handle(webImageRpc, ({ url }) => web.image(url));
  server.handle(webSearchRpc, ({ query }) => web.search(query));
  server.handle(webGeocodeRpc, ({ name, near }) => web.geocode(name, near));
  server.handle(webTileRpc, ({ z, x, y }) => web.tile(z, x, y));

  server.handle(projectChangesRpc, ({ agentId, target, paths }, { paseo }) =>
    readProjectChanges(paseo, agentId, target, paths),
  );
  server.handle(projectPatchesRpc, ({ agentId, target, paths }, { paseo }) =>
    readProjectPatches(paseo, agentId, target, paths),
  );
  server.handle(projectCommitsRpc, ({ agentId }, { paseo }) =>
    readProjectCommits(paseo, agentId),
  );
  server.handle(projectPullRequestRpc, ({ agentId }, { paseo }) =>
    readProjectPullRequest(paseo, agentId),
  );
  server.handle(projectThreadsRpc, ({ agentId, ids }, { paseo }) =>
    readProjectThreads(paseo, agentId, ids),
  );
  server.handle(projectEnvironmentsRpc, ({ agentId }, { paseo }) =>
    readProjectEnvironments(paseo, agentId, false),
  );
  server.handle(projectEnvironmentRpc, ({ agentId, environmentId }, { paseo }) =>
    readProjectEnvironment(paseo, agentId, environmentId),
  );

  let demoSeq = 0;
  server.handle(appendDemoRpc, async ({ agentId, component }, { paseo }) => {
    let code = DEFAULT_DEMO_SPEC;
    let name = "Estimate";
    if (component && component.trim() !== "") {
      try {
        code = await readGallerySpec(component.trim());
        name = component.trim();
      } catch {
        // Fall back to default demo spec if the named gallery file doesn't exist
      }
    }
    const id = `genui-demo-${Date.now()}-${++demoSeq}`;
    await paseo.agents.ref(agentId).timeline.append({
      type: "plugin",
      id,
      kind: GENUI_BLOCK_KIND,
      version: 1,
      data: {
        language: "ui",
        code,
        complete: true,
        fenceIndex: 0,
        messageId: id,
      },
    });
    return { appended: true, name };
  });

  return () => {
    unsubscribeSettings();
  };
}
