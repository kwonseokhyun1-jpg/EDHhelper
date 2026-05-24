const names = ['the-ur-dragon', 'atraxa-praetors-voice', 'sol-ring']
for (const slug of names) {
  const res = await fetch(`https://json.edhrec.com/pages/commanders/${slug}.json`, {
    headers: { Accept: 'application/json', 'User-Agent': 'CommanderHelper/1.0' },
  })
  const j = await res.json()
  console.log('\n', slug, j.num_decks_avg)
  console.log('rank_over_time', JSON.stringify(j.panels?.rank_over_time, null, 2)?.slice(0, 1500))
}
