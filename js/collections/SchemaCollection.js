/**
 * @file
 * A Backbone model for representing paragraphs_editor edit buffer items.
 */

(function ($, Backbone, Drupal) {

  Drupal.paragraphs_editor.SchemaCollection = Backbone.Collection.extend({

    model: Drupal.paragraphs_editor.SchemaModel,

    initialize: function(models, options) {
      this.listenTo(options.contextCollection, 'add', this.addContextSchema);
    },

    isAllowed: function(id, bundleName) {
      var model = this.get(id);
      return model && model.get('allowed')[bundleName];
    },

    addContextSchema: function(contextModel) {
      var id = contextModel.get('fieldId');
      if (id) {
        if (!this.get(id)) {
          var collection = this;
          $.get('/ajax/paragraphs-editor/schema/' + id, '', function(response) {
            var attributes = {
              'id': id,
              'allowed': {},
            };
            _.each(response, function(bundleName) {
              attributes.allowed[bundleName] = true;
            });
            collection.add(attributes, {merge: true});
          });
        }
      }
    }

  })

}(jQuery, Backbone, Drupal));
