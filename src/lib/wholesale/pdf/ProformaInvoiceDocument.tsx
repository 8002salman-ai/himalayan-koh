import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { WholesalePurchaseRequestItem } from '@/lib/supabase/database.types';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  brand: { fontSize: 18, fontWeight: 700, color: '#b86452' },
  small: { fontSize: 9, color: '#555' },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  section: { marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  tableHeader: { flexDirection: 'row', borderBottom: '1 solid #ccc', paddingBottom: 4, marginBottom: 4, fontWeight: 700 },
  tableRow: { flexDirection: 'row', paddingVertical: 3, borderBottom: '1 solid #eee' },
  colName: { flex: 4 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  totalsBlock: { alignSelf: 'flex-end', width: 220, marginTop: 12 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  grandTotal: { fontWeight: 700, fontSize: 12, borderTop: '1 solid #1a1a1a', paddingTop: 4, marginTop: 4 },
  footer: { marginTop: 32, fontSize: 8, color: '#777' },
  statusBadge: { fontSize: 9, color: '#b86452', fontWeight: 700, textTransform: 'uppercase' },
});

export interface ProformaInvoiceData {
  requestNumber: string;
  status: string;
  createdAt: string;
  dealerBusinessName: string;
  dealerAddress: string;
  shippingAddress: { fullName: string; addressLine1: string; addressLine2?: string; city: string; state: string; postalCode: string; country: string };
  items: WholesalePurchaseRequestItem[];
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
  currency: string;
}

function money(value: number, currency: string): string {
  return `${currency === 'USD' ? '$' : currency + ' '}${Number(value).toFixed(2)}`;
}

export function ProformaInvoiceDocument({ data }: { data: ProformaInvoiceData }) {
  return (
    <Document title={`Proforma Invoice ${data.requestNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Himalayan Koh</Text>
            <Text style={styles.small}>12620 FM 1960 W Ste A-4, Houston, TX 77065</Text>
            <Text style={styles.small}>orders@himalayankoh.com · (832) 224-6466</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.title}>PROFORMA INVOICE</Text>
            <Text style={styles.small}>No. {data.requestNumber}</Text>
            <Text style={styles.small}>Date: {new Date(data.createdAt).toLocaleDateString()}</Text>
            <Text style={styles.statusBadge}>{data.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 700, marginBottom: 2 }}>Bill / Ship To</Text>
          <Text>{data.dealerBusinessName}</Text>
          <Text>{data.shippingAddress.fullName}</Text>
          <Text>{data.shippingAddress.addressLine1}{data.shippingAddress.addressLine2 ? `, ${data.shippingAddress.addressLine2}` : ''}</Text>
          <Text>{data.shippingAddress.city}, {data.shippingAddress.state} {data.shippingAddress.postalCode}</Text>
          <Text>{data.shippingAddress.country}</Text>
        </View>

        <View>
          <View style={styles.tableHeader}>
            <Text style={styles.colName}>Product</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Line Total</Text>
          </View>
          {data.items.map((item) => {
            const qty = item.admin_adjusted_quantity ?? item.quantity;
            const price = item.admin_adjusted_unit_price ?? item.unit_price;
            return (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.colName}>{item.product_name}</Text>
                <Text style={styles.colQty}>{qty}</Text>
                <Text style={styles.colPrice}>{money(price, data.currency)}</Text>
                <Text style={styles.colTotal}>{money(qty * price, data.currency)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{money(data.subtotal, data.currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Shipping</Text>
            <Text>{money(data.shippingCost, data.currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Tax</Text>
            <Text>{money(data.taxAmount, data.currency)}</Text>
          </View>
          <View style={[styles.totalsRow, styles.grandTotal]}>
            <Text>Grand Total</Text>
            <Text>{money(data.total, data.currency)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This is a proforma invoice for a wholesale purchase request — it is not a demand for payment and does not
          represent a confirmed order. Pricing, quantities, and availability are subject to stock verification and
          admin approval. An official Tax/Commercial Invoice will be issued once this request is approved, paid, and
          converted into an order.
        </Text>
      </Page>
    </Document>
  );
}
