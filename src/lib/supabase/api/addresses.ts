import { supabase } from '../client';
import type { Address } from '../database.types';

export type AddressFormData = {
  label?: string;
  full_name: string;
  phone?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default_shipping?: boolean;
  is_default_billing?: boolean;
};

export const addressesApi = {
  async getUserAddresses(userId: string): Promise<Address[]> {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default_shipping', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Address[];
  },

  async createAddress(userId: string, address: AddressFormData): Promise<Address> {
    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: userId,
        ...address,
      } as never)
      .select()
      .single();

    if (error) throw error;
    return data as Address;
  },

  async updateAddress(addressId: string, address: Partial<AddressFormData>): Promise<Address> {
    const { data, error } = await supabase
      .from('addresses')
      .update(address as never)
      .eq('id', addressId)
      .select()
      .single();

    if (error) throw error;
    return data as Address;
  },

  async deleteAddress(addressId: string): Promise<void> {
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', addressId);

    if (error) throw error;
  },
};
