// scripts/migrate_database.js
// Run this after updating your schema to fix existing data
// Usage: SUPABASE_SERVICE_ROLE_KEY=key NEXT_PUBLIC_SUPABASE_URL=url node scripts/migrate_database.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  console.log('🚀 Starting database migration...')
  
  try {
    // 1. Check if tenants table exists and has data
    console.log('📊 Checking tenants table...')
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .limit(1)
    
    if (tenantsError && tenantsError.code === '42P01') {
      console.log('⚠️  Tenants table does not exist. Creating it first...')
      console.log('Please run the schema SQL in Supabase SQL Editor first!')
      return
    }

    // 2. Check payments without tenant_id and try to link them
    console.log('🔗 Linking payments to tenants...')
    const { data: paymentsWithoutTenant, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .is('tenant_id', null)
    
    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return
    }

    console.log(`Found ${paymentsWithoutTenant?.length || 0} payments without tenant_id`)

    // 3. For each payment, try to find matching tenant
    for (const payment of paymentsWithoutTenant || []) {
      try {
        // Try to find tenant by phone number first
        let matchingTenant = null
        
        if (payment.phone) {
          const { data: tenantsByPhone } = await supabase
            .from('tenants')
            .select('*')
            .eq('phone', payment.phone)
            .limit(1)
          
          if (tenantsByPhone && tenantsByPhone.length > 0) {
            matchingTenant = tenantsByPhone[0]
          }
        }
        
        // If not found by phone, try by name
        if (!matchingTenant && payment.tenant_name) {
          const { data: tenantsByName } = await supabase
            .from('tenants')
            .select('*')
            .ilike('name', `%${payment.tenant_name}%`)
            .limit(1)
          
          if (tenantsByName && tenantsByName.length > 0) {
            matchingTenant = tenantsByName[0]
          }
        }
        
        // If still no match, create a new tenant
        if (!matchingTenant && payment.tenant_name && payment.phone) {
          console.log(`Creating new tenant for payment ${payment.id}: ${payment.tenant_name}`)
          
          const { data: newTenant, error: createError } = await supabase
            .from('tenants')
            .insert({
              name: payment.tenant_name,
              phone: payment.phone,
              room_number: payment.room_number || null,
              is_active: true,
              notes: `Auto-created from payment ${payment.id}`
            })
            .select()
            .single()
          
          if (createError) {
            console.error(`Failed to create tenant for payment ${payment.id}:`, createError)
            continue
          }
          
          matchingTenant = newTenant
        }
        
        // Update payment with tenant_id
        if (matchingTenant) {
          console.log(`Linking payment ${payment.id} to tenant ${matchingTenant.name}`)
          
          const { error: updateError } = await supabase
            .from('payments')
            .update({ tenant_id: matchingTenant.id })
            .eq('id', payment.id)
          
          if (updateError) {
            console.error(`Failed to update payment ${payment.id}:`, updateError)
          }
        } else {
          console.log(`No tenant found or created for payment ${payment.id}`)
        }
        
      } catch (e) {
        console.error(`Error processing payment ${payment.id}:`, e)
      }
    }

    // 4. Verify the migration
    console.log('✅ Verifying migration...')
    const { data: linkedPayments } = await supabase
      .from('payments')
      .select('id, tenant_name, tenant_id')
      .not('tenant_id', 'is', null)
    
    console.log(`✅ Migration complete! ${linkedPayments?.length || 0} payments now have tenant_id`)
    
    // 5. Test the problematic query
    console.log('🧪 Testing payments query...')
    const { data: testPayments, error: testError } = await supabase
      .from('payments')
      .select(`
        *,
        tenant:tenant_id (
          name, 
          phone, 
          room_number
        )
      `)
      .limit(5)
    
    if (testError) {
      console.error('❌ Query still failing:', testError)
    } else {
      console.log('✅ Query working! Sample data:')
      testPayments?.forEach(p => {
        console.log(`  - ${p.tenant?.name || p.tenant_name} (${p.month})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

main()
