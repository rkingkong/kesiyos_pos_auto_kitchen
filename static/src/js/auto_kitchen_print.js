/** Minimal kitchen ticket with Takeaway, Customer, Online flag, Pricelist. */
odoo.define("kesiyos_pos_auto_kitchen.auto_kitchen_print", function (require) {
    "use strict";
    const { patch } = require("@web/core/utils/patch");
    const PaymentScreen = require("@point_of_sale/app/screens/payment_screen/payment_screen").PaymentScreen;

    // --- helpers ------------------------------------------------------------
    function getTakeaway(order) {
        // Try common properties across POS/restaurant builds
        try {
            if (typeof order.get_delivery_type === "function") {
                return order.get_delivery_type() === "take_away";
            }
            if (typeof order.get_is_take_away === "function") {
                return !!order.get_is_take_away();
            }
            if (typeof order.is_take_away !== "undefined") {
                return !!order.is_take_away;
            }
            if (order.delivery_type) {
                return order.delivery_type === "take_away" || order.delivery_type === "takeaway";
            }
        } catch (_) {}
        return false;
    }
    function getCustomerName(order) {
        try {
            const partner = (typeof order.get_client === "function") ? order.get_client() : order.partner;
            return partner ? (partner.name || partner.display_name || "") : "";
        } catch (_) { return ""; }
    }
    function getPricelistName(order, pos) {
        try {
            if (order.pricelist && order.pricelist.name) return order.pricelist.name;
            if (typeof order.get_pricelist === "function") {
                const pl = order.get_pricelist();
                if (pl && pl.name) return pl.name;
            }
            if (pos?.pricelists && order?.pricelist_id) {
                const found = pos.pricelists.find(p => p.id === order.pricelist_id);
                if (found) return found.name || "";
            }
            if (typeof pos?.get_pricelist === "function") {
                const pl2 = pos.get_pricelist();
                if (pl2 && pl2.name) return pl2.name;
            }
        } catch (_) {}
        return "";
    }
    function getOrderedOnline(order) {
        // Heuristic: check several likely flags; default "No"
        try {
            if (order.is_online === true) return "Yes";
            if (order.online_order === true) return "Yes";
            if (order.source === "online" || order.channel === "online") return "Yes";
            if (order.uiState && (order.uiState.origin === "online" || order.uiState.is_online)) return "Yes";
            if (typeof order.get_is_online === "function" && order.get_is_online()) return "Yes";
        } catch (_) {}
        return "No";
    }

    function buildKitchenHTML(order, pos) {
        const isTakeAway = getTakeaway(order);
        const table = (typeof order.getTable === "function") ? order.getTable() : null;
        const tableName = table ? (table.name || "") : "";
        const emp = (typeof order.get_employee === "function") ? order.get_employee() : (pos?.get_cashier?.() || {});
        const userName = emp?.name || "";
        const customer = getCustomerName(order);
        const pricelistName = getPricelistName(order, pos) || "Default";
        const orderedOnline = getOrderedOnline(order);

        const lines = (typeof order.get_orderlines === "function") ? order.get_orderlines() : [];
        const rows = lines.map(l => {
            const qty = l.get_quantity ? l.get_quantity() : (l.quantity || 0);
            const name = l.get_full_product_name ? l.get_full_product_name() : (l.product?.display_name || l.product?.name || "");
            const note = (typeof l.get_note === "function") ? (l.get_note() || "") : (l.customer_note || "");
            return `
                <tr>
                  <td class="qty">${qty}</td>
                  <td class="name">${name}</td>
                </tr>
                ${note ? `<tr><td></td><td class="note">Nota: ${note}</td></tr>` : ""}`;
        }).join("");

        const now = (new Date()).toLocaleString();

        return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Comanda Cocina</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  body { font-family: Arial, sans-serif; font-size: 12px; width: 72mm; }
  h1 { font-size: 18px; text-align: center; margin: 0 0 6px 0; }
  .badge { text-align:center; font-weight:bold; margin: 6px 0; padding:3px 0; border:1px solid #000; }
  .meta { margin: 6px 0; line-height: 1.3; }
  .meta b { display:inline-block; width: 80px; }
  table { width: 100%; border-collapse: collapse; }
  .qty { width: 14mm; font-weight: bold; text-align: right; padding-right: 4mm; }
  .name { word-wrap: break-word; }
  .note { font-style: italic; color: #000; padding-bottom: 3px; }
  .sep { border-top: 1px dashed #000; margin: 6px 0; }
  .footer { text-align:center; margin-top:8px; font-size:11px; }
</style>
</head>
<body>
  <h1>COMANDA</h1>
  ${isTakeAway ? `<div class="badge">PARA LLEVAR</div>` : ``}
  <div class="meta">
    <div><b>Orden:</b> ${order.name || ""}</div>
    <div><b>Fecha:</b> ${now}</div>
    ${tableName ? `<div><b>Mesa:</b> ${tableName}</div>` : ""}
    ${customer ? `<div><b>Cliente:</b> ${customer}</div>` : ""}
    <div><b>Online:</b> ${orderedOnline}</div>
    <div><b>Lista Precio:</b> ${pricelistName}</div>
    ${userName ? `<div><b>Cajero:</b> ${userName}</div>` : ""}
  </div>
  <div class="sep"></div>
  <table><tbody>
    ${rows || `<tr><td class="name">[Sin líneas]</td></tr>`}
  </tbody></table>
  <div class="sep"></div>
  <div class="footer">Preparación inmediata</div>
  <script>
    window.onload = function(){
      window.print();
      setTimeout(() => window.close(), 300);
    };
  </script>
</body>
</html>`;
    }

    async function printKitchenViaBrowser(order, pos) {
        const html = buildKitchenHTML(order, pos);
        const w = window.open("", "_blank", "width=350,height=600,noopener,noreferrer");
        if (!w) {
            console.warn("[kesiyos_pos_auto_kitchen] No se pudo abrir ventana de impresión.");
            return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
    }

    // Patch: print kitchen first, then continue to receipt
    patch(PaymentScreen.prototype, "kesiyos_pos_auto_kitchen_payment_patch_minimal2", {
        async validateOrder(isForceValidate) {
            const pos = this.env.services.pos;
            const order = this.currentOrder;
            try {
                const enabled = !!(pos?.config?.auto_kitchen_on_payment);
                if (enabled && order && !order._kitchen_printed_on_payment) {
                    await printKitchenViaBrowser(order, pos);
                    order._kitchen_printed_on_payment = true;
                }
            } catch (err) {
                console.warn("[kesiyos_pos_auto_kitchen] Kitchen print error:", err);
            }
            return await super.validateOrder(isForceValidate);
        },
    });
});
