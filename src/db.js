import { supabase } from './supabaseClient'

// ═══════════════════════════════════════════
// Database helper for discoveries
// Drop-in replacement for window.storage
// ═══════════════════════════════════════════

export const db = {
  // Save a discovery
  async saveDiscovery(record) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('discoveries')
      .insert({
        user_id: user.id,
        user_email: user.email,
        discovery_id: record.id,
        vertical: record.vertical,
        business_name: record.businessName,
        sf_url: record.sfUrl || '',
        record_type: record.recordType,
        notes: record.notes,
        checked: record.checked,
        section_extras: record.sectionExtras,
        completion: record.completion,
        saved_at: record.savedAt,
      })
      .select()

    if (error) throw error
    return data
  },

  // Load all discoveries for current user
  async loadDiscoveries() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('discoveries')
      .select('*')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Load a single discovery by its discovery_id
  async loadDiscovery(discoveryId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('discoveries')
      .select('*')
      .eq('user_id', user.id)
      .eq('discovery_id', discoveryId)
      .single()

    if (error) throw error
    return data
  },

  // Delete a discovery
  async deleteDiscovery(discoveryId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('discoveries')
      .delete()
      .eq('user_id', user.id)
      .eq('discovery_id', discoveryId)

    if (error) throw error
    return true
  },

  // Get current user info
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Sign out
  async signOut() {
    await supabase.auth.signOut()
  },
}
