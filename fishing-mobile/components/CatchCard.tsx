import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image"; // ✅ 替换 react-native 的 Image
import { API_BASE, bust } from "@/lib/config";
import { getRarityColor, getRarityBgColor } from "@/constants/fishData";

// 这是一个模糊的 hash 占位符 (Blurhash)，在图片加载前显示
// 你可以根据图片的主色调生成，这里用一个通用的灰色
const BLURHASH = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";

type CatchCardProps = {
  item: any;
  onPress: () => void;
  showRarity?: boolean;
};

export default function CatchCard({ item, onPress, showRarity = false }: CatchCardProps) {
  // 处理图片路径：如果是本地文件直接用，如果是远程则拼接 API_BASE 并加缓存戳
  const uri = item.image_path?.startsWith("file://")
    ? item.image_path
    : bust(`${API_BASE}${item.image_path}`);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image
        style={styles.image}
        source={{ uri }}
        placeholder={BLURHASH} // ✅ 加载时显示模糊占位
        contentFit="cover"     // ✅ 替代 resizeMode
        transition={500}       // ✅ 0.5秒淡入动画
        cachePolicy="disk"     // ✅ 强制磁盘缓存
      />

      <View style={styles.overlay}>
        <Text style={styles.species} numberOfLines={1}>
          {item.species_label || "Unknown"}
        </Text>
        
        {item.species_confidence && (
          <Text style={styles.confidence}>
            {(item.species_confidence * 100).toFixed(0)}%
          </Text>
        )}
      </View>

      {/* 显示本地/云端状态徽章 */}
      {item._local && (
        <View style={styles.localBadge}>
          <Text style={styles.localBadgeText}>Local</Text>
        </View>
      )}
      
      {/* 稀有度徽章 (可选) */}
      {showRarity && item.rarity && (
         <View style={[styles.rarityBadge, { backgroundColor: getRarityBgColor(item.rarity) }]}>
           <Text style={[styles.rarityText, { color: getRarityColor(item.rarity) }]}>
             {item.rarity}
           </Text>
         </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 0.8, // 保持卡片比例
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
  },
  species: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  confidence: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
  },
  localBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  localBadgeText: {
    color: "white",
    fontSize: 9,
    fontWeight: "700",
  },
  rarityBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: "700",
  },
});