/**
 * @file
 * Provides Drupal API integrations for paragraphs_ckeditor.
 */

(function ($, window, Drupal, drupalSettings) {

  /**
   * jQuery utility plugin.
   */
  $.fn.paragraphsCKEditor = function(action, options) {

    var rtn = this;

    this.each(function() {

      // Provides the singleton data instance that stores persistent state for
      // this plugin.
      var paragraphsCKEditor = $(this).data('paragraphsCKEditor');
      if (!paragraphsCKEditor) {
        var widget_build_id = $(this).attr('data-paragraphs-ckeditor-build-id');
        var field_id = $(this).attr('data-paragraphs-ckeditor-field-id');
        var prototypes = Drupal.paragraphs_ckeditor;

        var commandController = new prototypes.ParagraphCommandController($(this), widget_build_id, field_id);
        var previewFetcher = new prototypes.ParagraphPreviewFetcher(commandController);
        var widgetManager = new prototypes.ParagraphWidgetManager(commandController, previewFetcher);

        paragraphsCKEditor = {
          "commandController": commandController,
          "previewFetcher": previewFetcher,
          "widgetManager": widgetManager,
        };

        $(this).data('paragraphsCKEditor', paragraphsCKEditor);
      }

      if (action == 'widget-manager') {
        rtn = paragraphsCKEditor.widgetManager;
      }

      else if (action == 'process-command-response') {
        if (options.preview) {
          paragraphsCKEditor.previewFetcher.update(options.preview);
        }
      }
    });

    return rtn;
  };

})(jQuery, window, Drupal, drupalSettings);
