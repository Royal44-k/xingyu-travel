import { SiteHeader } from '@/components/site-header';
import { AssistantClient } from '@/features/assistant/assistant-client';

export default function AssistantPage() {
  return <><SiteHeader activePath="/assistant" /><AssistantClient /></>;
}
