# /odoo/custom/addons/kesiyos_pos_auto_kitchen/models/pos_config.py
from odoo import api, fields, models

class PosConfig(models.Model):
    _inherit = "pos.config"

    auto_kitchen_on_payment = fields.Boolean(
        string="Print Kitchen Order on Payment",
        help="If enabled, when the cashier clicks Validate, the Kitchen Order "
             "will be printed immediately before the receipt.",
        default=True,
    )
