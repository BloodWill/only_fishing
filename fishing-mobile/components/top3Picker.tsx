import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { TopKItem } from "../lib/api";

export default function Top3Picker(props: {
  visible: boolean;
  topk: TopKItem[];
  onChoose: (sid: string) => void;
  onCancel: () => void;
}) {
  const { visible, topk, onChoose, onCancel } = props;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={S.backdrop}>
        <View style={S.card}>
          <Text style={S.title}>What fish is this?</Text>
          {topk.map((t, i) => (
            <TouchableOpacity key={t.species_id} style={S.row} onPress={() => onChoose(t.species_id)}>
              <Text style={S.rank}>{i + 1}.</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.name}>{t.common_name}</Text>
                <Text style={S.sub}>{t.scientific_name}</Text>
              </View>
              <Text style={S.conf}>{(t.confidence * 100).toFixed(1)}%</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onCancel} style={S.cancel}><Text style={{ fontWeight: "700" }}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  card: { backgroundColor: "white", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  rank: { width: 26, textAlign: "right", marginRight: 8, fontWeight: "700" },
  name: { fontSize: 16, fontWeight: "600" },
  sub: { color: "#6b7280", fontSize: 12 },
  conf: { fontVariant: ["tabular-nums"] },
  cancel: { marginTop: 8, alignSelf: "center", padding: 8 },
});
