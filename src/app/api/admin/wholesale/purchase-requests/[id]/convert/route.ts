import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { getErrorMessage } from '@/lib/errors';
import { serverConvertPurchaseRequest } from '@/lib/wholesale/serverConvertPurchaseRequest';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: requestId } = await params;

  try {
    const order = await serverConvertPurchaseRequest(requestId, auth.userId);
    return NextResponse.json(order);
  } catch (error) {
    console.error('Purchase request conversion failed:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Unable to convert purchase request to an order.') },
      { status: 500 }
    );
  }
}
