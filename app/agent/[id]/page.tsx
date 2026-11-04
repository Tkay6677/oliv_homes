import { AgentPublicProfilePage } from '@/components/oliv-pages'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AgentPublicProfilePage id={id} />
}
