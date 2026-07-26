'use client';

import { useEffect } from 'react';
import CheckoutPage from './CheckoutPage';

/**
 * Retail checkout policy layer.
 *
 * The underlying checkout still owns order creation, shipping, coupons,
 * address validation, Stripe PaymentIntent creation, and confirmation. This
 * wrapper removes the manual invoice path from the retail surface without
 * duplicating any payment-critical business logic.
 *
 * Stripe's Payment Element automatically displays the methods enabled and
 * eligible for the current customer/order, including card, Klarna, and
 * Afterpay/Clearpay.
 */
export default function RetailCheckoutPage() {
  useEffect(() => {
    const applyRetailPaymentPolicy = () => {
      const paymentHeading = Array.from(document.querySelectorAll('h2')).find(
        (element) => element.textContent?.trim() === 'Payment',
      );
      const paymentSection = paymentHeading?.closest('section');

      if (paymentSection) {
        const buttons = Array.from(paymentSection.querySelectorAll('button'));
        const invoiceButton = buttons.find((button) =>
          button.textContent?.includes('Pay by Invoice'),
        );
        invoiceButton?.remove();

        const paymentIntro = paymentHeading?.nextElementSibling;
        if (paymentIntro instanceof HTMLElement) {
          paymentIntro.textContent =
            'Pay securely with Credit / Debit Card, Klarna, or Afterpay / Clearpay. Available methods are shown by Stripe based on eligibility.';
        }

        const stripeButton = buttons.find((button) =>
          button.textContent?.includes('Pay with Card'),
        );
        if (stripeButton) {
          const title = Array.from(stripeButton.querySelectorAll('p')).find(
            (paragraph) => paragraph.textContent?.trim() === 'Pay with Card',
          );
          if (title) title.textContent = 'Card, Klarna or Afterpay';

          const description = Array.from(stripeButton.querySelectorAll('p')).find(
            (paragraph) => paragraph !== title,
          );
          if (description) {
            description.textContent =
              'Choose an available Stripe payment method and complete payment securely.';
          }
        }

        const instructionsHeading = Array.from(paymentSection.querySelectorAll('p')).find(
          (paragraph) => paragraph.textContent?.trim() === 'How card checkout works',
        );
        instructionsHeading?.parentElement?.remove();

        const paymentGrid = paymentSection.querySelector('.grid');
        paymentGrid?.classList.remove('md:grid-cols-2');
        paymentGrid?.classList.add('grid-cols-1');
      }

      Array.from(document.querySelectorAll('button')).forEach((button) => {
        const label = button.textContent?.trim();
        if (label === 'Continue to payment') {
          button.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) node.textContent = 'Proceed to secure payment';
          });
        }
        if (label === 'Place order (invoice)') {
          button.setAttribute('hidden', 'true');
        }
      });

      Array.from(document.querySelectorAll('p')).forEach((paragraph) => {
        if (paragraph.textContent?.includes('Invoice order')) paragraph.remove();
      });
    };

    applyRetailPaymentPolicy();
    const observer = new MutationObserver(applyRetailPaymentPolicy);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return <CheckoutPage />;
}
