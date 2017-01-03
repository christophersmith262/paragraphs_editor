/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (Backbone, Drupal, $) {

  'use strict';

  Drupal.paragraphs_editor.ContextFactory = function(globalSettings, prototypes) {
    this._globalSettings = globalSettings;
    this._prototypes = prototypes;
    this._contexts = new Backbone.Collection();
  }

  $.extend(Drupal.paragraphs_editor.ContextFactory.prototype, {

    create: function(contextString, settings) {
      if (!this._contexts.get(contextString)) {
        if (!settings) {
          settings = this._getContextSettings(contextString);
        }
        var editBuffer = new this._prototypes.EditBuffer([], {
          model: this._prototypes.EditBufferItemModel,
          targetContextString: contextString
        });
        this._contexts.add(new this._prototypes.Context({
          id: contextString}, {
            editBuffer: editBuffer,
            settings: settings,
          }
        ));
      }
      return this._contexts.get(contextString);
    },

    touch: function(contextString) {
      this.create(contextString);
    },

    collection: function() {
      return this._contexts;
    },

    _getContextSettings: function(contextString) {
      if (this._globalSettings.instances && this._globalSettings.instances[contextString]) {
        return this._globalSettings.instances[contextString];
      }
      return {};
    },
  });

})(Backbone, Drupal, jQuery);
