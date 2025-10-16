sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/core/routing/History",
        "sap/ui/model/Sorter",
        "sap/m/MessageToast",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "../utils/Formatter",
        "../utils/Helper"
    ],
    function (Controller, Filter, FilterOperator, History, Sorter, MessageToast, JSONModel, MessageBox, Formatter, Helper) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.ReviewInvoices', {
            formatter: Formatter,
            _bundle: null,
            _sortState: {},
            _invoicesSkip: 0,
            _invoicesHasMore: true,
            _router: null, 

            formatDate: function (dateString) {
                return Formatter.formatDate(dateString);
            },

            formatCurrency: function (value) {
                return Formatter.formatCurrency(value);
            },

            onInit: function () {
                this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this._router = this.getOwnerComponent().getRouter();

                Helper.setStickyHeader(this, "reviewInvoicesTable");
            },

            onNavBack: function () {
                Helper.onNavBack(this);
            },

            onInvoicePress(oEvent) {
                const oInvoice = oEvent.getSource().getBindingContext("invoices").getObject();
                const encodedProductName = encodeURIComponent(oInvoice.ProductName);
                this._router.navTo("invoicedetails", {
                    OrderID: oInvoice.OrderID,
                    ProductName: encodedProductName
                });
            },

            onFilterInvoices: function (oEvent) {
                Helper.onFilter(oEvent, this, "reviewInvoicesTable", ["CustomerID", "ProductName"]);
            },

            onSortInvoicesColumn(fieldPath, columnIndex) {
                const table = this.byId("reviewInvoicesTable");
                const binding = table.getBinding("items");

                if (!this._sortState[fieldPath]) {
                    this._sortState[fieldPath] = false;
                }

                this._resetInvoicesHeaderIcons();

                this._sortState[fieldPath] = !this._sortState[fieldPath];
                const isAscending = this._sortState[fieldPath];

                const sorter = new Sorter(fieldPath, !isAscending);
                binding.sort(sorter);

                const columns = table.getColumns();
                const column = columns[columnIndex];
                const header = column.getHeader();

                let icon = null;
                if (header.getMetadata().getName() === "sap.m.HBox") {
                    const headerItems = header.getItems();
                    if (headerItems && headerItems[1]) {
                        icon = headerItems[1];
                    }
                }

                if (icon && icon.getMetadata().getName() === "sap.ui.core.Icon") {
                    if (isAscending) {
                        icon.setSrc("sap-icon://sort-ascending");
                    } else {
                        icon.setSrc("sap-icon://sort-descending");
                    }
                }
            },

            _resetInvoicesHeaderIcons() {
                const table = this.byId("reviewInvoicesTable");
                const columns = table.getColumns();

                columns.forEach(function (column) {
                    const header = column.getHeader();

                    if (header && header.getMetadata().getName() === "sap.m.HBox") {
                        const headerItems = header.getItems();
                        if (headerItems) {
                            headerItems.forEach(function (item) {
                                if (item.getMetadata().getName() === "sap.ui.core.Icon" &&
                                    (item.getSrc().includes("sort") || item.getSrc() === "sap-icon://text-align-center")) {
                                    item.setSrc("sap-icon://sort");
                                }
                            });
                        }
                    }
                });
            },

            onSortProductName() {
                this.onSortInvoicesColumn("ProductName", 1);
            },

            onSortCustomerName() {
                this.onSortInvoicesColumn("CustomerName", 2);
            },

            onSettingsPress: async function () {
                await Helper.onSettingsPress(this);
            },

            onLogoutPress: async function () {
                await Helper.onLogoutPress(this);
            },

            onSettingsSave: function () {
                Helper.onSettingsSave(this);
            },

            onCloseDialog: function () {
                Helper.onCloseDialog(this);
            },

            onLogoutConfirm: function () {
                Helper.onLogoutConfirm(this);
            },

            onHomepagePress: function () {
                Helper.onHomepagePress(this);
            },
        });
    }
);