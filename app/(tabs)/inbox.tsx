import { View, Text, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInboxStore, GuardianMessage } from '@/stores/inboxStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

function MessageRow({ message }: { message: GuardianMessage }) {
  const markRead = useInboxStore((s) => s.markRead);

  return (
    <Pressable onPress={() => markRead(message.id)}>
      <Card className={`mb-3 ${!message.isRead ? 'border-l-4 border-blue-500' : ''}`}>
        <View className="flex-row justify-between items-start mb-1">
          <Text className={`font-semibold flex-1 ${!message.isRead ? 'text-gray-900' : 'text-gray-500'}`}>
            {message.subject}
          </Text>
          {!message.isRead && <Badge label="New" color="gold" />}
        </View>
        <Text className="text-sm text-gray-500" numberOfLines={2}>{message.body}</Text>
        <Text className="text-xs text-gray-400 mt-1">Week {message.week}</Text>
      </Card>
    </Pressable>
  );
}

export default function InboxScreen() {
  const messages = useInboxStore((s) => s.messages);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <Text className="text-lg font-bold text-gray-900">Guardian Inbox</Text>
      </View>

      {messages.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">No messages from guardians yet.</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageRow message={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
        />
      )}
    </SafeAreaView>
  );
}
