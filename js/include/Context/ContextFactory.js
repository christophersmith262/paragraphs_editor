/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (Backbone, Drupal, $) {

  'use strict';

  Drupal.paragraphs_editor.ContextFactory = function(globalSettings, prototypes) {
    this._globalSettings = globalSettings;
    this._prototypes = prototypes;
    this._contexts = {};
  }

  $.extend(Drupal.paragraphs_editor.ContextFactory.prototype, {

    create: function(contextString) {
      if (!this._contexts[contextString]) {
        var settings = this._getContextSettings(contextString);
        var commandEmitter = new this._prototypes.EditorCommandEmitter(contextString, settings);
        var editBuffer = new this._prototypes.EditBuffer(commandEmitter);
        this._contexts[contextString] = new this._prototypes.Context(contextString, commandEmitter, editBuffer, settings);
      }
      return this._contexts[contextString];
    },

    _getContextSettings: function(contextString) {
      if (this._globalSettings.instances && this._globalSettings.instances[contextString]) {
        return this._globalSettings.instances[contextString];
      }
      return {};
    },
  });

})(Backbone, Drupal, jQuery);
