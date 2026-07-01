import { supabase } from '../client';
import type { DealerApplication, DealerApplicationWithDocuments, Product } from '../database.types';

export interface DealerApplicationData {
  businessName: string;
  ownerName: string;
  businessEmail: string;
  phone: string;
  website?: string;
  businessType: string;
  yearsInBusiness?: number;
  country: string;
  state: string;
  city: string;
  zip: string;
  address: string;
  monthlyPurchase?: string;
  productsInterested: string[];
  salesChannels: string[];
  notes?: string;
}

export type DealerDocumentType = 'reseller_permit' | 'business_license' | 'tax_certificate' | 'additional';

export const dealerApi = {
  async getMyApplication(userId: string): Promise<DealerApplicationWithDocuments | null> {
    const { data, error } = await supabase
      .from('dealer_applications')
      .select('*, dealer_documents(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as DealerApplicationWithDocuments | null;
  },

  async submitApplication(userId: string, data: DealerApplicationData): Promise<DealerApplication> {
    const { data: application, error } = await supabase
      .from('dealer_applications')
      .insert({
        user_id: userId,
        business_name: data.businessName,
        owner_name: data.ownerName,
        business_email: data.businessEmail,
        phone: data.phone,
        website: data.website || null,
        business_type: data.businessType,
        years_in_business: data.yearsInBusiness ?? null,
        country: data.country,
        state: data.state,
        city: data.city,
        zip: data.zip,
        address: data.address,
        monthly_purchase: data.monthlyPurchase || null,
        products_interested: data.productsInterested,
        sales_channels: data.salesChannels,
        notes: data.notes || null,
      } as never)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('dealer_audit_log').insert({
      application_id: (application as DealerApplication).id,
      actor_id: userId,
      action: 'application_submitted',
    } as never);

    return application as DealerApplication;
  },

  async uploadDocument(
    applicationId: string,
    userId: string,
    file: File,
    documentType: DealerDocumentType
  ): Promise<void> {
    const path = `${userId}/${documentType}-${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('dealer-documents')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase.from('dealer_documents').insert({
      application_id: applicationId,
      document_type: documentType,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
    } as never);

    if (insertError) throw insertError;
  },

  async updateContactInfo(
    applicationId: string,
    updates: { phone?: string; website?: string | null; notes?: string | null }
  ): Promise<DealerApplication> {
    const { data, error } = await supabase
      .from('dealer_applications')
      .update({ ...updates, updated_at: new Date().toISOString() } as never)
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;
    return data as DealerApplication;
  },

  async getDealerCatalog(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('retail_only', false)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as Product[];
  },
};

/** Effective dealer unit price — falls back to retail price if no dealer price is set. */
export function dealerUnitPrice(product: Pick<Product, 'price' | 'dealer_price'>): number {
  return product.dealer_price ?? product.price;
}
