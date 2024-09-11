import { getConfig } from '../../../config';
import TenantService from '../../../services/tenantService';
import Plans from '../../../security/plans';
import ApiResponseHandler from '../../apiResponseHandler';
import Error403 from '../../../errors/Error403';
import Error400 from '../../../errors/Error400';
import { tenantSubdomain } from '../../../services/tenantSubdomain';

export default async (req, res) => {
  try {
    if (!getConfig().PLAN_STRIPE_SECRET_KEY) {
      throw new Error400(
        req.language,
        'tenant.stripeNotConfigured',
      );
    }

    const stripe = require('stripe')(
      getConfig().PLAN_STRIPE_SECRET_KEY,
    );

    const currentTenant = req.currentTenant;
    const currentUser = req.currentUser;

    if (!currentTenant || !currentUser) {
      throw new Error403(req.language);
    }

    if (
      currentTenant.plan !== Plans.values.free &&
      currentTenant.planStatus !== 'cancel_at_period_end' &&
      currentTenant.planUserId !== currentUser.id
    ) {
      throw new Error403(req.language);
    }

    let planStripeCustomerId =
      currentTenant.planStripeCustomerId;

    if (
      !planStripeCustomerId ||
      currentTenant.planUserId !== currentUser.id
    ) {
      const stripeCustomer = await stripe.customers.create({
        email: currentUser.email,
        metadata: {
          tenantId: currentTenant.id,
        },
      });

      planStripeCustomerId = stripeCustomer.id;
    }

    await new TenantService(req).updatePlanUser(
      currentTenant.id,
      planStripeCustomerId,
      currentUser.id,
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: Plans.selectStripePriceIdByPlan(
            req.body.plan,
          ),
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${tenantSubdomain.frontendUrl(
        currentTenant,
      )}/plan`,
      cancel_url: `${tenantSubdomain.frontendUrl(
        currentTenant,
      )}/plan`,
      customer: planStripeCustomerId,
    });

    return ApiResponseHandler.success(req, res, session);
  } catch (error) {
    return ApiResponseHandler.error(req, res, error);
  }
};
