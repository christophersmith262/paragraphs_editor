/**
 * @file
 * Provides Drupal API integrations for paragraphs_ckeditor.
 */

(function ($, window, Drupal, drupalSettings) {

  $.fn.paragraphsCKEditor = function(action, options) {

    // Provides the singleton data instance that stores persistent state for
    // this plugin.
    var paragraphsCKEditor = $(this).data('paragraphsCKEditor');
    if (!paragraphsCKEditor) {
      var $emitter = $(this).find('.paragraphs-ckeditor__command-emitter');
      var command_queue = new Backbone.Collection({
        model: Drupal.paragraphs_ckeditor.CommandModel
      });

      paragraphsCKEditor = {
        commandQueue: command_queue,
        commandQueueProcessor: new Drupal.paragraphs_ckeditor.CommandQueueProcessor($emitter, command_queue),
        paragraphPreviews: new Backbone.Collection({
          model: Drupal.paragraphs_ckeditor.ParagraphPreviewModel,
        }),
      };

      paragraphsCKEditor.paragraphPreviews.add({
        id: "test",
        markup: "test!!!",
      });

      $(this).data('paragraphsCKEditor', paragraphsCKEditor);
    }

    if (action == 'insert-paragraph') {
      paragraphsCKEditor.commandQueue.add({
        id: "insert-paragraph",
      });
    }
    else if (action == 'get-paragraph') {
      return paragraphsCKEditor.paragraphPreviews.get(options.uuid);
    }
    else if (action == 'edit-paragraph') {
      paragraphsCKEditor.commandQueue.add({
        id: "edit-paragraph",
        data: options.uuid
      });
    }
    else if (action == 'remove-paragraph') {
      paragraphsCKEditor.paragraphPreviews.remove(options.uuid);
    }
    else if (action == 'process-command-response') {
      var command = paragraphsCKEditor.commandQueue.get(options.id);

      if (command) {
        command.set({response: response.data});
      }

      if (response.preview) {
        paragraphsCKEditor.paragraphPreviews.add(response.preview);
      }
    }

    return this;
  };

})(jQuery, window, Drupal, drupalSettings);
