import { Metadata, ResolvingMetadata } from 'next'
import { supabase } from '@/lib/supabase'
import TrackClient from './TrackClient'

// This runs on the server to generate SEO tags
export async function generateMetadata(
  { params }: { params: { id: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { data: track } = await supabase
    .from('tracks')
    .select('title, artist_id')
    .eq('id', params.id)
    .maybeSingle()

  let artistName = 'Unknown Artist'
  if (track?.artist_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', track.artist_id)
      .maybeSingle()
    artistName = profile?.full_name || 'Unknown Artist'
  }

  const title = track ? `${track.title} by ${artistName} | JIG'SWurlD` : 'Track | JIG'SWurlD'
  const description = track ? `Listen to "${track.title}" by ${artistName} on JIG'SWurlD.` : 'Listen to independent music on JIG'SWurlD.'

  return {
    title,
    description,
    openGraph: { title, description, type: 'music.song' },
  }
}

// This renders the UI
export default function TrackPage({ params }: { params: { id: string } }) {
  return <TrackClient trackId={params.id} />
}