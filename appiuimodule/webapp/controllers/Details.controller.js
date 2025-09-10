sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/core/routing/History",
    ],
    function (Controller, History) {
        "use strict";

        return Controller.extend("appiuimodule.controllers.Details", {
            /**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             * @memberOf appiuimodule.ext.overview.Overview
             */
            onInit() {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("details").attachPatternMatched(this.onObjectMatched, this);
            },


            onObjectMatched(oEvent) {
                var sTaskId = oEvent.getParameter("arguments").taskId;
                var oModel = this.getOwnerComponent().getModel("tasks");
                var aTasks = oModel.getProperty("/tasks");
                var oTask = aTasks.find(function (task) {
                    return String(task.taskId) === String(sTaskId);
                });
                // oTask now contains the task object with the matching taskId
                if (oTask) {
                    // set it to a local model for binding
                    var oTaskModel = loadTaskProperties(oTask);
                    this.getView().setModel(oTaskModel, "taskModel");
                }
                this.updateStatusStyle();
            },

            /**
             * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
             * (NOT before the first rendering! onInit() is used for that one!).
             * @memberOf appiuimodule.ext.overview.Overview
             */
            //  onBeforeRendering: function() {
            //
            //  },

            /**
             * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
             * This hook is the same one that SAPUI5 controls get after being rendered.
             * @memberOf appiuimodule.ext.overview.Overview
             */
            updateStatusStyle: function () {
                var oTable = this.byId("taskTable");
                var aItems = oTable.getItems();

                aItems.forEach(function (oItem) {
                    var aCells = oItem.getCells();
                    var sLabel = aCells[0].getText();

                    if (sLabel === "Status") {
                        var sStatus = aCells[1].getText();
                        // Remove any previous status classes
                        clearStatysStyle(aCells);
                        // Add class based on status value
                        setNewStatusStyle(sStatus, aCells);
                    }
                });
            },

            onNavBack() {
                const oHistory = History.getInstance();
                const sPreviousHash = oHistory.getPreviousHash();

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("overview", {}, true);
                }
            },

            async onApprove() {
                this.decisionDialog ??= await this.loadFragment({
                    name: "appiuimodule.views.TaskDecision"
                });

                // Clear previous content
                this.decisionDialog.removeAllContent();


                // Add a simple text for Approve
                this.decisionDialog.addContent(
                    new sap.m.VBox({
                        alignItems: "Center",
                        items: [
                            new sap.ui.core.Icon({src: "sap-icon://accept"}),
                            new sap.m.Text({
                                text: "Confirm Approval",
                                textAlign: "Center",
                                width: "100%"
                            })
                        ]
                    })
                );

                this.decisionDialog.setBeginButton(new sap.m.Button({
                    text: "Confirm",
                    press: function () {
                        // handle confirm approve
                        this.decisionDialog.close();
                    }.bind(this)
                }));

                this.decisionDialog.open();
            },

            async onDecline() {
                this.decisionDialog ??= await this.loadFragment({
                    name: "appiuimodule.views.TaskDecision"
                });

                // Clear previous content
                this.decisionDialog.removeAllContent();

                // Add a simple text for Approve
                this.decisionDialog.addContent(
                    new sap.m.VBox({
                        alignItems: "Center",
                        items: [
                            new sap.ui.core.Icon({ src: "sap-icon://decline" }),
                            new sap.m.Input({placeholder: "Rejection reason..." })
                        ]
                    })
                );

                this.decisionDialog.setBeginButton(new sap.m.Button({
                    text: "Decline",
                    press: function () {
                        // handle decline approve
                        this.decisionDialog.close();
                    }.bind(this)
                }));

                this.decisionDialog.open();
            },
        });
    }
);
function setNewStatusStyle(sStatus, aCells) {
    if (sStatus === "Pending") {
        aCells[1].addStyleClass("statusPending");
    } else if (sStatus === "Approved") {
        aCells[1].addStyleClass("statusApproved");
    } else if (sStatus === "Rejected") {
        aCells[1].addStyleClass("statusRejected");
    }
}

function clearStatysStyle(aCells) {
    aCells[1].removeStyleClass("statusPending");
    aCells[1].removeStyleClass("statusApproved");
    aCells[1].removeStyleClass("statusRejected");
}

function loadTaskProperties(oTask) {
    return new sap.ui.model.json.JSONModel({
        taskDetails: [
            { label: "Task ID", value: oTask.taskId },
            { label: "Type", value: oTask.type },
            { label: "Title", value: oTask.title },
            { label: "Creation Date", value: oTask.creationDate },
            { label: "Due Date", value: oTask.dueDate },
            { label: "Status", value: oTask.status },
            { label: "Employee", value: oTask.employee }
        ]
    });
}

