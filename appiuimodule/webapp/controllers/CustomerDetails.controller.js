sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/core/routing/History",
        "sap/m/library",
        "sap/ui/model/Sorter",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/m/MessageToast",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "../utils/Formatter",
        "../utils/Helper"
    ],
    function (Controller, History, mobileLibrary, Sorter, Filter, FilterOperator, MessageToast, JSONModel, MessageBox, Formatter, Helper) {
        "use strict";

        return Controller.extend("appiuimodule.controllers.CustomerDetails", {
            formatter: Formatter,
            _sortState: {},
            bundle: null,
            _router: null,

            onInit() {
                this.bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this._router = this.getOwnerComponent().getRouter();
                //The context (scope) for the callback function
                // Ensures that inside onPatternMatched, this refers to the
                // controller instance
                this._router.getRoute("customerdetails").attachPatternMatched(this.onPatternMatched, this);
            },

            onPatternMatched: function (oEvent) {
                var sCustomerId = oEvent.getParameter("arguments").CustomerID;
                this.bindCustomerData(sCustomerId);

                // Apply filters to orders and invoices tables
                this.filterCustomerOrders(sCustomerId);
                this.filterCustomerInvoices(sCustomerId);

                this.setStickyHeadersForTables();
            },

            bindCustomerData: function (sCustomerId) {
                const oView = this.getView();
                const sPath = "/Customers('" + sCustomerId + "')";

                oView.bindElement({
                    path: sPath,
                    model: "odataModel",
                    events: {
                        dataRequested: function () {
                            oView.setBusy(true);
                        },
                        dataReceived: function () {
                            oView.setBusy(false);
                        }
                    }
                });
            },

            filterCustomerOrders: function (sCustomerId) {
                const oTable = this.byId("customerOrdersTable");
                if (!oTable) return;

                const oBinding = oTable.getBinding("items");
                if (oBinding) {
                    const oFilter = new Filter("CustomerID", FilterOperator.EQ, sCustomerId);
                    oBinding.filter([oFilter], "Application");
                }
            },

            filterCustomerInvoices: function (sCustomerId) {
                const oTable = this.byId("customerInvoicesTable");
                if (!oTable) return;

                const oBinding = oTable.getBinding("items");
                if (oBinding) {
                    const oFilter = new Filter("CustomerID", FilterOperator.EQ, sCustomerId);
                    oBinding.filter([oFilter], "Application");
                }
            },

            setStickyHeadersForTables: function () {
                Helper.setStickyHeader(this, "customerOrdersTable");
                Helper.setStickyHeader(this, "customerInvoicesTable");
            },

            onNavBack() {
                Helper.onNavBack(this);
            },


            onCustomerOrderPress(oEvent) {
                const oOrder = oEvent.getSource().getBindingContext("odataModel").getObject();
                this._router.navTo("orderdetails", { OrderID: oOrder.OrderID });
            },

            onCustomerInvoicePress(oEvent) {
                const oInvoice = oEvent.getSource().getBindingContext("odataModel").getObject();
                // Encode ProductName to handle special characters in URL
                const encodedProductName = encodeURIComponent(oInvoice.ProductName);
                this._router.navTo("invoicedetails", {
                    OrderID: oInvoice.OrderID,
                    ProductName: encodedProductName
                });
            },

            onHomePress: function () {
                Helper.onHomePress(this);
            },

            onSettingsPress: async function () {
                await Helper.onSettingsPress(this);
            },

            onSettingsSave: function () {
                Helper.onSettingsSave(this);
            },

            onCloseDialog: function () {
                Helper.onCloseDialog(this);
            },

            onLogoutPress: async function () {
                await Helper.onLogoutPress(this);
            },

            onLogoutConfirm: function () {
                Helper.onLogoutConfirm(this);
            },

            onHomepagePress: function () {
                Helper.onHomepagePress(this);
            },

            onSortOrderDate() {
                this.onSortColumn("customerOrdersTable", "OrderDate", 4);
            },

            onSortStatus() {
                this.onSortColumn("customerOrdersTable", "Status", 6);
            },

            onSortProductName() {
                this.onSortColumn("customerInvoicesTable", "ProductName", 1);
            },

            onSortInvoiceOrderDate() {
                this.onSortColumn("customerInvoicesTable", "OrderDate", 3);
            },

            onSortColumn(tableId, fieldPath, columnIndex, iconIndex = 1) {
                const table = this.byId(tableId);
                const binding = table.getBinding("items");

                if (!this._sortState[tableId]) {
                    this._sortState[tableId] = {};
                }

                this._resetAllSortIcons(tableId);

                if (this._sortState[tableId][fieldPath] === undefined) {
                    this._sortState[tableId][fieldPath] = false; // false = descending first
                }

                // Toggle sort direction
                this._sortState[tableId][fieldPath] = !this._sortState[tableId][fieldPath];
                const isAscending = this._sortState[tableId][fieldPath];

                // Create sorter
                const sorter = new Sorter(fieldPath, !isAscending);

                // Apply sorting
                binding.sort(sorter);

                // Update icon to show current sort direction
                const columns = table.getColumns();
                const column = columns[columnIndex];
                const header = column.getHeader();

                // Handle different header structures
                let icon = null;
                if (header.getMetadata().getName() === "sap.m.HBox") {
                    // Header is an HBox containing items
                    const headerItems = header.getItems();
                    if (headerItems && headerItems[iconIndex]) {
                        icon = headerItems[iconIndex];
                    }
                } else if (header.getMetadata().getName() === "sap.ui.core.Icon") {
                    // Header is directly an Icon
                    icon = header;
                }

                if (icon && icon.getMetadata().getName() === "sap.ui.core.Icon") {
                    if (isAscending) {
                        icon.setSrc("sap-icon://sort-ascending");
                    } else {
                        icon.setSrc("sap-icon://sort-descending");
                    }
                }
            },

            _resetAllSortIcons(tableId) {
                const table = this.byId(tableId);
                const columns = table.getColumns();

                columns.forEach(function (column) {
                    const header = column.getHeader();

                    if (header.getMetadata().getName() === "sap.m.HBox") {
                        // Header is an HBox containing items
                        const headerItems = header.getItems();
                        if (headerItems) {
                            headerItems.forEach(function (item) {
                                if (item.getMetadata().getName() === "sap.ui.core.Icon" &&
                                    (item.getSrc().includes("sort") || item.getSrc() === "sap-icon://sort")) {
                                    item.setSrc("sap-icon://sort");
                                }
                            });
                        }
                    } else if (header.getMetadata().getName() === "sap.ui.core.Icon") {
                        // Header is directly an Icon
                        if (header.getSrc().includes("sort") || header.getSrc() === "sap-icon://sort") {
                            header.setSrc("sap-icon://sort");
                        }
                    }
                });
            },

            formatDate: function (dateString) {
                return Formatter.formatDate(dateString);
            },

            formatStatusState: function (status) {
                return Formatter.formatStatusState(status);
            },

            formatShippedDate: function (shippedDate, status) {
                return Formatter.formatShippedDate(shippedDate, status);
            },

            formatCurrency: function (value) {
                return Formatter.formatCurrency(value);
            },

            formatFax: function (value) {
                return Formatter.formatFax(value);
            },

            formatRegion: function (value) {
                return Formatter.formatRegion(value);
            },
        });
    }
);