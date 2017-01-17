/**
 * @file
 * A Backbone model for representing paragraphs_editor edit buffer items.
 */

(function (Backbone, Drupal) {

  Drupal.paragraphs_editor.ContextCollection = Backbone.Collection.extend({

    model: Drupal.paragraphs_editor.ContextModel,

    initialize: function(models, options) {
      this._prototypes = options.prototypes;
    },

    create: function(contextString) {
      if (!this.get(contextString)) {
        this.add(new this._prototypes.ContextModel({
          id: contextString,
        }, { prototypes: this._prototypes }));
      }
      return this.get(contextString);
    },

    touch: function(contextString) {
      this.create(contextString);
    },

    updateContextId: function(oldContextId, newContextId) {
      var model = this.get(oldContextId);
      if (model) {
        model.set({id: newContextId});
      }
    }
  });

}(Backbone, Drupal));
