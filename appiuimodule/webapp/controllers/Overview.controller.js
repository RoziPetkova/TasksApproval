sap.ui.define([
    'sap/ui/core/mvc/Controller',
    "sap/ui/core/routing/History",
    "sap/ui/model/Sorter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/library",
    "sap/ui/Device",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (Controller, History, Sorter, Filter, FilterOperator, mobileLibrary, Device, MessageToast, JSONModel, MessageBox) {
    'use strict';

    return Controller.extend('appiuimodule.controllers.Overview', {
        _bundle: null,
        _router: null,
        _sortState: {
            customersTable: {},
            invoicesTable: {},
            ordersTable: {}
        },
        _originalOrdersData: null,

        onInit: function () {
            this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            this._router = this.getOwnerComponent().getRouter();

            this._loadAllOrders();
            this.setViewModel();
        },

        onAfterRendering: function () {
            this._setStickyHeaderForTables();
        },

        _setStickyHeaderForTables: function () {
            const Sticky = mobileLibrary.Sticky;
            const oCustomersTable = this.byId("customersTable");
            if (oCustomersTable) {
                oCustomersTable.setSticky([Sticky.ColumnHeaders]);
            }
            const oOrdersTable = this.byId("ordersTable");
            if (oOrdersTable) {
                oOrdersTable.setSticky([Sticky.ColumnHeaders]);
            }
            const oInvoicesTable = this.byId("invoicesTable");
            if (oInvoicesTable) {
                oInvoicesTable.setSticky([Sticky.ColumnHeaders]);
            }
        },

        setViewModel() {
            let isMobile = false;
            if (Device.system.phone || Device.system.tablet) {
                isMobile = true;
            }
            var viewModel = new JSONModel({
                isMobile: isMobile
            });
            this.getView().setModel(viewModel, "viewModel");
        },

        // _loadCustomersModel: async function () {
        //     const oCustomersTable = this.byId("customersTable");
        //     if (oCustomersTable) {
        //         oCustomersTable.setBusy(true);
        //     }

        //     var oCustomersModel = new JSONModel();

        //     try {
        //         const response = await fetch("https://services.odata.org/V4/Northwind/Northwind.svc/Customers?$top=10");
        //         if (!response.ok) {
        //             throw new Error(`HTTP error! status: ${response.status}`);
        //         }
        //         const data = await response.json();

        //         data.hasMore = data.value && data.value.length === 10;

        //         oCustomersModel.setData(data);

        //         this._customersSkip = 10;
        //         this._customersHasMore = data.hasMore;
        //     } catch (error) {
        //         console.error("Error loading customers data: ", error);
        //         oCustomersModel.setData({ value: [], hasMore: false });
        //         MessageBox.error(this._bundle.getText("failedToLoadCustomersMessage"));
        //     } finally {
        //         if (oCustomersTable) {
        //             oCustomersTable.setBusy(false);
        //         }
        //     }

        //     this.getOwnerComponent().setModel(oCustomersModel, "customers");
        // },

        onLoadMoreCustomers: function () {
            this._router.navTo("reviewcustomers");
        },

        onLoadMoreInvoices: function () {
            this._router.navTo("reviewinvoices");
        },

        _loadAllOrders: async function () {
            const oOrdersTable = this.byId("ordersTable");
            if (oOrdersTable) {
                oOrdersTable.setBusy(true);
            }

            try {
                let url = "https://services.odata.org/V4/Northwind/Northwind.svc/Orders";

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                if (data && data.value) {
                    this.handleStatusProperty(data);
                }

                this._originalOrdersData = data.value;

                const oOrdersModel = new JSONModel();
                oOrdersModel.setData(data);
                this.getOwnerComponent().setModel(oOrdersModel, "orders");
            } catch (error) {
                console.error("Error loading all orders:", error);
                MessageBox.error(this._bundle.getText("failedToLoadOrdersMessage"));
            } finally {
                if (oOrdersTable) {
                    oOrdersTable.setBusy(false);
                }
            }
        },

        handleStatusProperty(data) {
            data.value.forEach(function (order) {
                if (order.OrderID % 2 == 0) {
                    order.ShippedDate = null;
                }
                order.Status = order.ShippedDate ? "Shipped" : "Pending";
            });
        },

        onOrderPress(oEvent) {
            this._router.navTo("orderdetails",
                { OrderID: oEvent.getSource().getBindingContext("orders").getObject().OrderID });
        },

        onCustomerPress(oEvent) {
            this._router.navTo("customerdetails",
                { CustomerID: oEvent.getSource().getBindingContext("odataModel").getObject().CustomerID });
        },

        onInvoicePress: function(oEvent) {
            const oInvoice = oEvent.getSource().getBindingContext("odataModel").getObject();
            this._router.navTo("invoicedetails", {
                OrderID: oInvoice.OrderID
            });
        },

        formatStatusState: function (status) {
            if (status === "Shipped") {
                return "Success";
            } else if (status === "Pending") {
                return "Warning";
            } else if (status === "Declined") {
                return "Error";
            }
            return "None";
        },

        formatDate: function (dateString) {
            if (!dateString) return "";
            var date = new Date(dateString);
            return date.toLocaleDateString();
        },

        formatShippedDate: function (shippedDate, status) {
            if (status === "Declined") {
                return "None";
            }
            if (!shippedDate) return "";
            var date = new Date(shippedDate);
            return date.toLocaleDateString();
        },

        onFilterOrders: function (oEvent) {
            const query = oEvent.getParameter("query");
            this.searchOrders(query);
        },

        searchOrders: function (query) {
            const oOrdersModel = this.getOwnerComponent().getModel("orders");

            if (!this._originalOrdersData) {
                if (oOrdersModel && oOrdersModel.getProperty("/value")) {
                    this._originalOrdersData = oOrdersModel.getProperty("/value");
                } else {
                    console.warn("Orders data not available for search");
                    return;
                }
            }

            const allOrders = this._originalOrdersData || [];
            let filteredOrders;

            if (query && query.trim()) {
                const queryLower = query.toLowerCase();
                filteredOrders = allOrders.filter(function (order) {
                    return order.CustomerID.toLowerCase().includes(queryLower);
                });
            } else {
                filteredOrders = allOrders;
            }

            oOrdersModel.setProperty("/value", filteredOrders);
        },

        onStatusFilterChange: function (oEvent) {
            const selectedKey = oEvent.getParameter("selectedItem").getKey();
            this.filterOrdersByStatus(selectedKey);
        },

        filterOrdersByStatus: function (status) {
            const oOrdersModel = this.getOwnerComponent().getModel("orders");

            if (!this._originalOrdersData) {
                if (oOrdersModel && oOrdersModel.getProperty("/value")) {
                    this._originalOrdersData = oOrdersModel.getProperty("/value");
                } else {
                    console.warn("Orders data not available for status filtering");
                    return;
                }
            }

            const allOrders = this._originalOrdersData || [];
            let filteredOrders;

            if (status === "Shipped") {
                filteredOrders = allOrders.filter(function (order) {
                    return order.Status === "Shipped";
                });
            } else if (status === "Pending") {
                filteredOrders = allOrders.filter(function (order) {
                    return order.Status === "Pending";
                });
            } else {
                filteredOrders = allOrders;
            }

            oOrdersModel.setProperty("/value", filteredOrders);
        },

        onFilter: function (oEvent) {
            const sQuery = oEvent.getParameter("query");
            const oSearchField = oEvent.getSource();
            const sTableId = oSearchField.data("tableId");
            const aFieldNames = oSearchField.data("filterFields").split(",");;

            const oTable = this.byId(sTableId);
            const oBinding = oTable.getBinding("items");

            if (sQuery && sQuery.trim()) {
                const aFilters = aFieldNames.map(function(sFieldName) {
                    return new Filter(sFieldName.trim(), FilterOperator.Contains, sQuery);
                });

                const oFilter = new Filter({
                    filters: aFilters,
                    and: false
                });
                oBinding.filter(oFilter, "Application");
            } else {
                oBinding.filter([], "Application");
            }
        },

        onSortCustomersColumn(fieldPath, columnIndex) {
            const table = this.byId("customersTable");
            const binding = table.getBinding("items");

            if (!this._sortState["customersTable"]) {
                this._sortState["customersTable"] = {};
            }

            this._resetCustomersHeaderIcons();

            if (this._sortState["customersTable"][fieldPath] === undefined) {
                this._sortState["customersTable"][fieldPath] = false;
            }

            this._sortState["customersTable"][fieldPath] = !this._sortState["customersTable"][fieldPath];
            const isAscending = this._sortState["customersTable"][fieldPath];

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

        _resetCustomersHeaderIcons() {
            const table = this.byId("customersTable");
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

        onSortInvoicesColumn(fieldPath, columnIndex) {
            const table = this.byId("invoicesTable");
            const binding = table.getBinding("items");

            if (!this._sortState["invoicesTable"]) {
                this._sortState["invoicesTable"] = {};
            }

            this._resetInvoicesHeaderIcons();

            if (this._sortState["invoicesTable"][fieldPath] === undefined) {
                this._sortState["invoicesTable"][fieldPath] = false;
            }

            this._sortState["invoicesTable"][fieldPath] = !this._sortState["invoicesTable"][fieldPath];
            const isAscending = this._sortState["invoicesTable"][fieldPath];

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
            const table = this.byId("invoicesTable");
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

        onSortOrdersColumn(fieldPath, columnIndex) {
            const table = this.byId("ordersTable");
            const binding = table.getBinding("items");

            if (!this._sortState["ordersTable"]) {
                this._sortState["ordersTable"] = {};
            }

            this._resetOrdersHeaderIcons();

            if (this._sortState["ordersTable"][fieldPath] === undefined) {
                this._sortState["ordersTable"][fieldPath] = false;
            }

            this._sortState["ordersTable"][fieldPath] = !this._sortState["ordersTable"][fieldPath];
            const isAscending = this._sortState["ordersTable"][fieldPath];

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

        _resetOrdersHeaderIcons() {
            const table = this.byId("ordersTable");
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

        onSortCustomerId() {
            this.onSortCustomersColumn("CustomerID", 0);
        },

        onSortCountry() {
            this.onSortCustomersColumn("Country", 3);
        },

        onSortProductName: function() {
            this.onSortInvoicesColumn("ProductName", 1);
        },

        onSortCustomerName: function() {
            this.onSortInvoicesColumn("CustomerName", 2);
        },

        onSortCustomerIdOrders() {
            this.onSortOrdersColumn("CustomerID", 2);
        },

        onSortOrderDate() {
            this.onSortOrdersColumn("OrderDate", 4);
        },

        onSortStatus() {
            this.onSortOrdersColumn("Status", 6);
        },

        onSettingsPress: async function () {
            if (!this.settingsDialog) {
                this.settingsDialog = await this.loadFragment({
                    name: "appiuimodule.views.SettingsDialog"
                });
            }
            this.settingsDialog.open();
        },

        onLogoutPress: async function () {
            if (!this.logoutDialog) {
                this.logoutDialog = await this.loadFragment({
                    name: "appiuimodule.views.LogoutDialog"
                });
            }

            this.logoutDialog.setTitle(this._bundle.getText("logoutTitle"));
            this.logoutDialog.setIcon("sap-icon://log");

            this.logoutDialog.removeAllContent();
            this.logoutDialog.addContent(
                new sap.m.VBox({
                    alignItems: "Center",
                    items: [
                        new sap.m.Text({
                            text: this._bundle.getText("logoutConfirmationMessage"),
                            textAlign: "Center",
                            width: "100%"
                        })
                    ]
                })
            );

            this.logoutDialog.open();
        },

        onSettingsSave: function () {
            MessageToast.show(this._bundle.getText("settingsSavedMessage"));
            this.settingsDialog.close();
        },

        onCloseDialog: function () {
            if (this.settingsDialog && this.settingsDialog.isOpen()) {
                this.settingsDialog.close();
            }
            if (this.logoutDialog && this.logoutDialog.isOpen()) {
                this.logoutDialog.close();
            }
        },

        onLogoutConfirm: function () {
            cthis._router.navTo("logout");
            this.logoutDialog.close();
        },

        onHomepagePress: function () {
            this._router.navTo("entrypanel");
        },

        onNavBack: function () {
            const oHistory = History.getInstance();
            const sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this._router.navTo("entrypanel", {}, true);
            }
        },
    });
});