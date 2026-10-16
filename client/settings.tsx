import { useSettings, type PluginSurfaceProps } from "@getpaseo/plugin/client";
import { SettingsCard, SettingsSection, SettingsSwitch } from "@getpaseo/plugin/client/ui";
import React from "react";
import { Text, View } from "react-native";
import { genuiSettings } from "../shared/settings";

export function GenUiSettingsScreen({ theme }: PluginSurfaceProps) {
  const settings = useSettings(genuiSettings);

  if (settings.status === "loading") {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: theme.colors.foregroundMuted, fontSize: 13 }}>Loading settings…</Text>
      </View>
    );
  }

  if (settings.status !== "ready") {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: theme.colors.statusDanger, fontSize: 13 }}>{settings.error}</Text>
      </View>
    );
  }

  const { values, revision, save } = settings;

  return (
    <View style={{ gap: 16 }}>
      <SettingsSection title="Agent instructions">
        <SettingsCard>
          <SettingsSwitch
            label="Automatically teach new agents Generative UI"
            hint="Appends the 86-component ```ui and ```app reference to new agents' system prompt on creation."
            value={values.autoInstructions}
            onValueChange={(autoInstructions) => {
              void save({ ...values, autoInstructions }, revision);
            }}
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Network and web lookups">
        <SettingsCard>
          <SettingsSwitch
            label="Web lookups"
            hint="Lets ImageSearch (Wikimedia Commons), Map (Photon geocoding and OpenStreetMap tiles), and https Image links fetch through the Paseo daemon with private-IP protection and caching."
            value={values.webLookups}
            onValueChange={(webLookups) => {
              void save({ ...values, webLookups }, revision);
            }}
          />
        </SettingsCard>
      </SettingsSection>
    </View>
  );
}
