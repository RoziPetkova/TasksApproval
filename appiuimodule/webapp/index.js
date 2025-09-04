sap.ui.define([
	"sap/ui/core/mvc/XMLView"
], (XMLView) => {
	"use strict";

	XMLView.create({
		viewName: "appiuimodule.ext.overview.Overview"
	}).then((oView) => oView.placeAt("content"));
});
