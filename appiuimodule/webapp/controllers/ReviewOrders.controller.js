sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/core/routing/History",
        "sap/ui/model/Sorter",
        "sap/ui/Device",
        "sap/m/MessageToast",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox"
    ],
    function (Controller, Filter, FilterOperator, History, Sorter, Device, MessageToast, JSONModel, MessageBox) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.ReviewOrders', {
            _bundle: null,
            _sortState: {},
            _originalOrdersData: null,
            _ordersSkip: 0,
            _ordersHasMore: true,

            onInit: function () {
                this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this._loadOrdersModel().then(() => {
                    this._setStickyHeaderForOrdersTable();
                });
                this.setViewModel();
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

            _setStickyHeaderForOrdersTable: function () {
                sap.ui.require([
                    "sap/m/library"
                ], function (mobileLibrary) {
                    const Sticky = mobileLibrary.Sticky;

                    const oOrdersTable = this.byId("reviewOrdersTable");
                    if (oOrdersTable) {
                        oOrdersTable.setSticky([Sticky.ColumnHeaders]);
                    }
                }.bind(this));
            },

            _loadOrdersModel: async function () {
                const oTable = this.byId("reviewOrdersTable");
                if (oTable) {
                    oTable.setBusy(true);
                }

                try {
                    let url = "https://services.odata.org/V4/Northwind/Northwind.svc/Orders?$top=50";

                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    if (data.value) {
                        data.value.forEach(function (order) {
                            order.Status = order.ShippedDate ? "Shipped" : "Pending";
                        });
                    }

                    this._originalOrdersData = data.value;

                    data.hasMore = data.value && data.value.length === 50;

                    const oOrdersModel = new JSONModel();
                    oOrdersModel.setData(data);
                    this.getOwnerComponent().setModel(oOrdersModel, "orders");

                    this._ordersSkip = 50;
                    this._ordersHasMore = data.hasMore;
                } catch (error) {
                    console.error("Error loading orders data:", error);
                    const oOrdersModel = new JSONModel();
                    oOrdersModel.setData({ value: [], hasMore: false });
                    this.getOwnerComponent().setModel(oOrdersModel, "orders");
                    MessageBox.error(this._bundle.getText("failedToLoadOrdersMessage"));
                } finally {
                    oTable.setBusy(false);
                }
            },

            onLoadMoreOrders: async function () {
                if (!this._ordersHasMore) {
                    return;
                }

                const oOrdersModel = this.getOwnerComponent().getModel("orders");
                const currentData = oOrdersModel.getData();
                const oTable = this.byId("reviewOrdersTable");
                if (oTable) {
                    oTable.setBusy(true);
                }

                try {
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Orders?$top=50&$skip=${this._ordersSkip}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const newData = await response.json();

                    if (newData.value) {
                        newData.value.forEach(function (order) {
                            order.Status = order.ShippedDate ? "Shipped" : "Pending";
                        });
                    }

                    if (newData.value && newData.value.length > 0) {
                        currentData.value = currentData.value.concat(newData.value);

                        this._originalOrdersData = currentData.value;

                        this._ordersSkip += newData.value.length;
                        this._ordersHasMore = newData.value.length === 50;
                        currentData.hasMore = this._ordersHasMore;

                        oOrdersModel.setData(currentData);
                    } else {
                        this._ordersHasMore = false;
                        currentData.hasMore = false;
                        oOrdersModel.setData(currentData);
                    }
                } catch (error) {
                    console.error("Error loading more orders data: ", error);
                    this._ordersHasMore = false;
                    currentData.hasMore = false;
                    oOrdersModel.setData(currentData);
                    MessageBox.error(this._bundle.getText("failedToLoadMoreOrdersMessage"));
                } finally {
                    oTable.setBusy(false);
                }
            },

            onNavBack: function () {
                const oHistory = History.getInstance();
                const sPreviousHash = oHistory.getPreviousHash();

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("overview", {}, true);
                }
            },

            onOrderPress(oEvent) {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("orderdetails",
                    { OrderID: oEvent.getSource().getBindingContext("orders").getObject().OrderID });
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
                // Show "None" for declined orders
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

            onSortOrdersColumn(fieldPath, columnIndex) {
                const table = this.byId("reviewOrdersTable");
                const binding = table.getBinding("items");

                if (!this._sortState[fieldPath]) {
                    this._sortState[fieldPath] = false;
                }

                this._resetOrdersHeaderIcons();

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

            _resetOrdersHeaderIcons() {
                const table = this.byId("reviewOrdersTable");
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
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("logout");
                this.logoutDialog.close();
            },

            onHomepagePress: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("entrypanel");
            },
        });
    }
);