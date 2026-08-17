import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { ChatRoom } from '@/features/chat/chat-room';

export const metadata: Metadata = {
  title: '搭子聊天演示',
  description: '仅对完成双方同意的本地演示匹配开放，包含联系方式双向同意与安全工具。',
};

export default async function ChatPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
return <><SiteHeader variant="solid" /><ChatRoom matchId={matchId} /></>;
}
