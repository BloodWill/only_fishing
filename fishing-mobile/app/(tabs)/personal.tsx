// app/(tabs)/personal.tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, Link, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../contexts/AuthContext";
import { syncPending } from "@/lib/sync";

export default function AccountScreen() {
  const { user, loading, signOut } = useAuth();
  
  // Profile form state (when logged in)
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  // Password reset state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Sync catches when screen is focused (if logged in)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        syncPending(user.id).catch(console.warn);
      }
    }, [user?.id])
  );

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const onSaveChanges = () => {
    Alert.alert("Saved", "Your profile changes have been saved.");
  };

  const onUpdatePassword = () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    Alert.alert("Success", "Your password has been updated.");
    setShowPasswordReset(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // ============================================
  // LOCKED STATE (Not logged in)
  // ============================================
  if (!user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {/* Header */}
          <LinearGradient
            colors={["#06b6d4", "#3b82f6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <Text style={styles.headerIcon}>👤</Text>
            <Text style={styles.headerTitle}>Account</Text>
          </LinearGradient>

          {/* Locked Content */}
          <View style={styles.lockedContent}>
            <View style={styles.lockedAvatar}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
            <Text style={styles.lockedTitle}>Account Locked</Text>
            <Text style={styles.lockedDesc}>
              Please sign in to access your account settings and sync your catches online.
            </Text>

            {/* Sign In Button - navigates to login screen */}
            <TouchableOpacity 
              style={styles.loginBtn} 
              onPress={() => router.push('/login')}
            >
              <LinearGradient
                colors={["#06b6d4", "#3b82f6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginBtnGradient}
              >
                <Text style={styles.loginBtnText}>Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Why sign in?</Text>
              <Text style={styles.infoText}>• Sync catches across devices</Text>
              <Text style={styles.infoText}>• Appear on the leaderboard</Text>
              <Text style={styles.infoText}>• Build your online FishDex</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  // ============================================
  // LOGGED IN STATE
  // ============================================
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {/* Header */}
        <LinearGradient
          colors={["#06b6d4", "#3b82f6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Text style={styles.headerIcon}>👤</Text>
          <Text style={styles.headerTitle}>Account Settings</Text>
        </LinearGradient>

        <View style={styles.cardContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <LinearGradient colors={["#06b6d4", "#3b82f6"]} style={styles.avatar}>
              <Text style={styles.avatarEmoji}>🎣</Text>
            </LinearGradient>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>

          {/* Profile Section */}
          <View style={[styles.section, styles.sectionBlue]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>👤</Text>
              <Text style={[styles.sectionTitle, { color: "#2563eb" }]}>Profile Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>User ID</Text>
              <View style={[styles.inputReadonly]}>
                <Text style={styles.inputReadonlyText}>{user.id.slice(0, 24)}...</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter display name"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Email Section */}
          <View style={[styles.section, styles.sectionGreen]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📧</Text>
              <Text style={[styles.sectionTitle, { color: "#16a34a" }]}>Email</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputReadonly}>
                <Text style={styles.inputReadonlyText}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Provider</Text>
              <View style={styles.inputReadonly}>
                <Text style={styles.inputReadonlyText}>
                  {user.app_metadata?.provider || 'email'}
                </Text>
              </View>
            </View>
          </View>

          {/* Phone Section */}
          <View style={[styles.section, styles.sectionPurple]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📱</Text>
              <Text style={[styles.sectionTitle, { color: "#9333ea" }]}>Phone Number</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Password Section */}
          <View style={[styles.section, styles.sectionAmber]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🔐</Text>
              <Text style={[styles.sectionTitle, { color: "#d97706" }]}>Password</Text>
            </View>

            {!showPasswordReset ? (
              <TouchableOpacity
                style={styles.resetPasswordBtn}
                onPress={() => setShowPasswordReset(true)}
              >
                <Text style={styles.resetPasswordBtnText}>Reset Password</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.passwordForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current Password</Text>
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    secureTextEntry
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    secureTextEntry
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    secureTextEntry
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.passwordBtns}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setShowPasswordReset(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.updateBtn} onPress={onUpdatePassword}>
                    <Text style={styles.updateBtnText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Subscription Section */}
          <View style={styles.subscriptionSection}>
            <LinearGradient
              colors={["#8b5cf6", "#ec4899"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.subscriptionGradient}
            >
              <View style={styles.subscriptionHeader}>
                <Text style={styles.subscriptionIcon}>⭐</Text>
                <Text style={styles.subscriptionTitle}>Subscription</Text>
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>FREE</Text>
                </View>
              </View>

              <View style={styles.subscriptionInfo}>
                <View style={styles.subscriptionRow}>
                  <Text style={styles.subscriptionLabel}>Status</Text>
                  <Text style={styles.subscriptionValue}>Active</Text>
                </View>
                <View style={styles.subscriptionRow}>
                  <Text style={styles.subscriptionLabel}>Plan</Text>
                  <Text style={styles.subscriptionValue}>Basic</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.manageSubBtn}>
                <Text style={styles.manageSubBtnText}>Upgrade to Premium</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Quick Links */}
          <View style={[styles.section, styles.sectionGray]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🔗</Text>
              <Text style={[styles.sectionTitle, { color: "#374151" }]}>Quick Links</Text>
            </View>

            <Link href="/personal/collection" asChild>
              <TouchableOpacity style={styles.linkItem}>
                <Text style={styles.linkIcon}>📚</Text>
                <Text style={styles.linkText}>My Collection</Text>
                <Text style={styles.linkArrow}>→</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.saveBtn} onPress={onSaveChanges}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
              <Text style={styles.logoutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 14,
  },

  // Card
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },

  // Locked State
  lockedContent: {
    padding: 24,
    alignItems: "center",
  },
  lockedAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  lockIcon: {
    fontSize: 32,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  lockedDesc: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },

  // Login Button
  loginBtn: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
    width: "100%",
  },
  loginBtnGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  loginBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },

  // Info Box
  infoBox: {
    backgroundColor: "#f0f9ff",
    borderRadius: 10,
    padding: 14,
    width: "100%",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0369a1",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#0c4a6e",
    marginBottom: 4,
  },

  // Logged In State
  cardContent: {
    padding: 16,
  },

  // Avatar
  avatarContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 40,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16a34a",
  },

  // Sections
  section: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  sectionBlue: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  sectionGreen: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  sectionPurple: {
    backgroundColor: "#faf5ff",
    borderColor: "#e9d5ff",
  },
  sectionAmber: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  sectionGray: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },

  // Inputs
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "white",
    color: "#1f2937",
  },
  inputReadonly: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputReadonlyText: {
    fontSize: 15,
    color: "#6b7280",
  },

  // Password
  resetPasswordBtn: {
    backgroundColor: "#fef3c7",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  resetPasswordBtnText: {
    color: "#92400e",
    fontWeight: "600",
    fontSize: 14,
  },
  passwordForm: {
    marginTop: 4,
  },
  passwordBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#e5e7eb",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#374151",
    fontWeight: "600",
  },
  updateBtn: {
    flex: 1,
    backgroundColor: "#f59e0b",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  updateBtnText: {
    color: "white",
    fontWeight: "600",
  },

  // Subscription
  subscriptionSection: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  subscriptionGradient: {
    padding: 16,
  },
  subscriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  subscriptionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    flex: 1,
  },
  premiumBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
  subscriptionInfo: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  subscriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  subscriptionLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  subscriptionValue: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  manageSubBtn: {
    backgroundColor: "white",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  manageSubBtnText: {
    color: "#8b5cf6",
    fontWeight: "700",
    fontSize: 14,
  },

  // Links
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  linkIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "500",
  },
  linkArrow: {
    fontSize: 16,
    color: "#9ca3af",
  },

  // Action Buttons
  actionButtons: {
    marginTop: 8,
    gap: 10,
  },
  saveBtn: {
    backgroundColor: "#0891b2",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  logoutBtn: {
    backgroundColor: "#fef2f2",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutBtnText: {
    color: "#dc2626",
    fontSize: 16,
    fontWeight: "700",
  },
});
