# /odoo/custom/addons/kesiyos_pos_auto_kitchen/__manifest__.py
{
    "name": "POS Auto Kitchen Print on Payment",
    "version": "17.0.1.0",
    "summary": "Automatically print Kitchen Order right when payment is validated (before receipt).",
    "author": "Kesiyos",
    "license": "LGPL-3",
    "website": "https://kesiyos.com",
    "category": "Point of Sale",
    "depends": [
        "point_of_sale",
        "pos_restaurant",   # needed for kitchen printers
    ],
    "assets": {
        "point_of_sale.assets": [
            "kesiyos_pos_auto_kitchen/static/src/js/auto_kitchen_print.js",
        ],
    },
    "data": [
        "views/pos_config_views.xml",
    ],
    "installable": True,
    "application": False,
}
