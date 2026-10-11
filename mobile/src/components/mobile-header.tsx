import { useState } from 'react';
import { router } from 'expo-router';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MobileBrand } from '@/components/mobile-brand';
import { logout } from '@/lib/auth';

const C = {
  canvas: '#F8F9FD',
  white: '#FFFFFF',
  border: '#E4E8F2',
  ink: '#172033',
  muted: '#667085',
  blue: '#2438D5',
  blueDark: '#1724B1',
  pale: '#EEF2FF',
};

const navigation = [
  { label: 'Dashboard', route: '/' },
  { label: 'Start Interview', route: '/explore' },
  { label: 'Mock Interviews', route: '/explore' },
  { label: 'Practice Questions', route: '/practice' },
  { label: 'History', route: '/history' },
  { label: 'Performance', route: '/performance' },
  { label: 'Career & Academic', route: '/career' },
  { label: 'Community', route: '/community' },
  { label: 'Profile', route: '/profile' },
  { label: 'Settings', route: '/settings' },
  { label: 'Feedback', route: '/feedback' },
  { label: 'Help', route: '/help' },
  { label: 'Upgrade Plan', route: '/upgrade' },
];

export function MobileHeader({
  title,
  userName,
  userEmail,
  isAdmin = false,
}: {
  title: string;
  userName?: string;
  userEmail?: string;
  isAdmin?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    try {
      await logout();
      setMenuOpen(false);
      router.replace('/login');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not sign out.';
      setMenuOpen(false);
      router.push({ pathname: '/login', params: { signOutError: message } });
    }
  }

  const items = isAdmin
    ? [...navigation, { label: 'Admin Panel', route: '/admin' }]
    : navigation;

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open navigation"
          style={styles.menuButton}
          onPress={() => setMenuOpen(true)}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.brand}>
          <MobileBrand compact subtitle={title} />
        </View>
        <TouchableOpacity
          style={styles.avatar}
          accessibilityLabel="Open profile"
          onPress={() => router.push('/profile')}
        >
          <Text style={styles.avatarText}>
            {(userName || userEmail || 'U')
              .split(/\s+/)
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={menuOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            style={styles.scrim}
            onPress={() => setMenuOpen(false)}
            accessibilityLabel="Close navigation"
          />
          <View style={styles.drawer}>
            <View style={styles.drawerHead}>
              <View>
                <Text style={styles.drawerBrand}>InterviewMate</Text>
                <Text style={styles.drawerCaption}>YOUR WORKSPACE</Text>
              </View>
              <TouchableOpacity
                onPress={() => setMenuOpen(false)}
                style={styles.closeButton}
                accessibilityLabel="Close menu"
              >
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.links}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.navItem}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push(item.route as never);
                  }}
                >
                  <Text style={styles.navBullet}>◆</Text>
                  <Text style={styles.navLabel}>{item.label}</Text>
                  <Text style={styles.navArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.account}>
              <View style={styles.accountCopy}>
                <Text style={styles.accountName} numberOfLines={1}>
                  {userName || 'Your profile'}
                </Text>
                <Text style={styles.accountEmail} numberOfLines={1}>
                  {userEmail || 'Manage your account'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => void signOut()} style={styles.logout}>
                <Text style={styles.logoutText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export const MobileColors = C;

const styles = StyleSheet.create({
  header: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.pale,
  },
  menuIcon: { color: C.blue, fontSize: 19, fontWeight: '800' },
  brand: { flex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#DDF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#126B75', fontSize: 11, fontWeight: '900' },
  modalRoot: { flex: 1, flexDirection: 'row' },
  scrim: { flex: 1, backgroundColor: '#11182788' },
  drawer: {
    width: '82%',
    maxWidth: 360,
    backgroundColor: C.canvas,
    paddingTop: 20,
    paddingHorizontal: 15,
    paddingBottom: 14,
  },
  drawerHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  drawerBrand: { color: C.ink, fontSize: 18, fontWeight: '900' },
  drawerCaption: { color: C.blue, fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginTop: 6 },
  closeButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  closeText: { color: C.muted, fontSize: 25, lineHeight: 28 },
  links: { paddingVertical: 13 },
  navItem: { height: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginVertical: 3, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  navBullet: { color: C.blue, fontSize: 9, marginRight: 11 },
  navLabel: { flex: 1, color: C.ink, fontSize: 12, fontWeight: '700' },
  navArrow: { color: C.blue, fontSize: 20 },
  account: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountCopy: { flex: 1 },
  accountName: { color: C.ink, fontSize: 12, fontWeight: '800' },
  accountEmail: { color: C.muted, fontSize: 10, marginTop: 4 },
  logout: { backgroundColor: '#FFF1F2', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  logoutText: { color: '#BE123C', fontSize: 10, fontWeight: '800' },
});
