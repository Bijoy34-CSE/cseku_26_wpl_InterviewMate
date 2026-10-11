import { StyleSheet, Text, View } from 'react-native';

const C = {
  ink: '#142344',
  navy: '#111A35',
  blue: '#365FEA',
  cyan: '#43D5E8',
  pale: '#DCE7FF',
};

export function MobileBrand({
  subtitle,
  compact = false,
  centered = false,
}: {
  subtitle?: string;
  compact?: boolean;
  centered?: boolean;
}) {
  const markSize = compact ? 38 : 54;

  return (
    <View style={[styles.brand, centered && styles.centered]}>
      <View style={[styles.mark, { width: markSize, height: markSize, borderRadius: compact ? 12 : 17 }]}>
        <View style={[styles.bubble, compact && styles.compactBubble]}>
          <View style={styles.signal}>
            <View style={[styles.signalBar, styles.shortBar]} />
            <View style={[styles.signalBar, styles.tallBar]} />
            <View style={[styles.signalBar, styles.mediumBar]} />
          </View>
        </View>
        <View style={styles.signalDot} />
      </View>
      <View style={[styles.copy, centered && styles.centeredCopy]}>
        <Text style={[styles.name, compact && styles.compactName]}>
          Interview<Text style={styles.nameAccent}>Mate</Text>
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, compact && styles.compactSubtitle]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  centered: { flexDirection: 'column', gap: 10, alignSelf: 'center' },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.navy,
    borderWidth: 1,
    borderColor: '#34456C',
  },
  bubble: {
    width: 31,
    height: 25,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: C.blue,
    backgroundColor: '#19264A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBubble: { width: 23, height: 19, borderRadius: 7 },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  signalBar: { width: 2, borderRadius: 1, backgroundColor: C.pale },
  shortBar: { height: 5, backgroundColor: C.cyan },
  tallBar: { height: 11, backgroundColor: '#A879FF' },
  mediumBar: { height: 7, backgroundColor: C.pale },
  signalDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    top: 8,
    right: 8,
    backgroundColor: C.cyan,
  },
  copy: { flexShrink: 1 },
  centeredCopy: { alignItems: 'center' },
  name: {
    color: C.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  compactName: { fontSize: 14, lineHeight: 18, letterSpacing: -0.5 },
  nameAccent: { color: C.blue },
  subtitle: {
    color: '#667085',
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 2,
  },
  compactSubtitle: { fontSize: 8, letterSpacing: 1.1 },
});
