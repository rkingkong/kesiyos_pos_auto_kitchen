/** /odoo/custom/addons/kesiyos_pos_auto_kitchen/static/src/js/auto_kitchen_print.js
 *
 * Odoo 17 (OWL) - Patch the PaymentScreen so that when Validate is clicked,
 * we first send/print the Kitchen Order to configured kitchen printers,
 * then continue with the normal receipt/validation flow.
 *
 * The patch is guarded by the POS config boolean `auto_kitchen_on_payment`.
 */
odoo.define("kesiyos_pos_auto_kitchen.auto_kitchen_print", function (require) {
    "use strict";

    const { patch } = require("@web/core/utils/patch");
    const PaymentScreen = require("@point_of_sale/app/screens/payment_screen/payment_screen").PaymentScreen;

    patch(PaymentScreen.prototype, "kesiyos_pos_auto_kitchen_payment_patch", {
        async validateOrder(isForceValidate) {
            const pos = this.env.services.pos;
            const order = this.currentOrder;

            try {
                const cfg = pos.config || {};
                const enabled = !!cfg.auto_kitchen_on_payment;

                // Only attempt if:
                //  - feature enabled in this POS
                //  - we have an order
                //  - the restaurant module is active and any OrderPrinters exist
                const hasPrinters = (pos.orderPrinters && pos.orderPrinters.length) ? true : false;

                if (enabled && order && hasPrinters) {
                    // Avoid double printing if user backs out and re-enters payment
                    if (!order._kitchen_printed_on_payment) {
                        // Prefer explicit service API if available (Odoo may rename across minor versions)
                        if (typeof pos.sendOrderToKitchen === "function") {
                            await pos.sendOrderToKitchen(order);
                        } else if (typeof order.sendToKitchen === "function") {
                            await order.sendToKitchen();
                        } else if (typeof order.printChanges === "function") {
                            // Legacy/compat: print all lines as "changes" so the kitchen gets the full ticket.
                            await order.printChanges({ new_order: true });
                        }
                        order._kitchen_printed_on_payment = true;
                    }
                }
            } catch (err) {
                // Never block the sale; log and proceed to receipt
                console.warn("[kesiyos_pos_auto_kitchen] Kitchen print failed:", err);
            }

            // Continue with the standard payment validation (this shows/prints the receipt)
            return await super.validateOrder(isForceValidate);
        },
    });
});
