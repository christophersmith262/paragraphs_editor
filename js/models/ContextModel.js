/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.ContextModel = Backbone.Model.extend({

    constructor: function(attributes, options) {
      this._prototypes = options.prototypes;
      Backbone.Model.apply(this, [attributes, options]);
    },

    defaults: /** @lends Drupal.paragraphs_editor.CommandModel# */{
      entityId: '',
      fieldId: '',
      buildId: '',
      settings: {},
    },

    set: function(attributes, options) {
      if (options && options.prototypes) {
        this._prototypes = options.prototypes;
      }

      if (attributes.id) {
        var parts = attributes.id.split(':');
        attributes.fieldId = parts[0];
        attributes.buildId = parts[1];
        attributes.entityId = parts[2];

        if (!this.editBuffer) {
          this.editBuffer = new this._prototypes.EditBufferItemCollection([], {
            contextId: attributes.id,
            prototypes: this._prototypes,
          });
        }
      }

      this._updateFieldReference(attributes);

      if (attributes.editBufferItems) {
        this.editBuffer.add(attributes.editBufferItems, {merge: true});
        delete attributes.editBufferItems;
      }

      return Backbone.Model.prototype.set.call(this, attributes, options);
    },

    getSettings: function() {
      return this.get('settings');
    },

    getSetting: function(key) {
      return this.get('settings')[key];
    },

    _updateFieldReference(attributes) {
      if (attributes.fieldId && attributes.fieldId != this.get('fieldId')) {
      }
    }

  });

})(jQuery, Backbone, Drupal);
