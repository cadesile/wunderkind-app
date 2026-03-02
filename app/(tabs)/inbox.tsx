import { View, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInboxStore, GuardianMessage } from '@/stores/inboxStore';
import { PixelText } from '@/components/ui/PixelText';
import { Badge } from '@/components/ui/Badge';
import { WK, pixelShadow } from '@/constants/theme';

function MessageRow({ message }: { message: GuardianMessage }) {
  const markRead = useInboxStore((s) => s.markRead);
  const isUnread = !message.isRead;

  return (
    <Pressable onPress={() => markRead(message.id)}>
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: isUnread ? WK.yellow : WK.border,
        borderLeftWidth: isUnread ? 4 : 3,
        borderLeftColor: isUnread ? WK.yellow : WK.border,
        padding: 12,
        marginBottom: 10,
        ...pixelShadow,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <PixelText
            size={8}
            color={isUnread ? WK.text : WK.dim}
            style={{ flex: 1, marginRight: 8 }}
            numberOfLines={2}
          >
            {message.subject.toUpperCase()}
          </PixelText>
          {isUnread && <Badge label="NEW" color="yellow" />}
        </View>
        <PixelText size={7} dim numberOfLines={2}>{message.body}</PixelText>
        <PixelText size={7} dim style={{ marginTop: 6 }}>WK {message.week}</PixelText>
      </View>
    </Pressable>
  );
}

export default function InboxScreen() {
  const messages = useInboxStore((s) => s.messages);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      {/* Header */}
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}>
        <PixelText size={10} upper>Guardian Inbox</PixelText>
      </View>

      {messages.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <PixelText size={16}>📭</PixelText>
          <PixelText size={8} dim>NO MESSAGES YET</PixelText>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageRow message={item} />}
          contentContainerStyle={{ padding: 10 }}
        />
      )}
    </SafeAreaView>
  );
}
