/**
 * @file
 * Provides Drupal API integrations for paragraphs_ckeditor.
 */

(function ($, window, Drupal, drupalSettings) {

  /**
   * jQuery plugin for interacting with paragraphs enabled editor instances.
   */
  $.fn.paragraphsCKEditor = function(action, options) {

    // Default to supporting call chaining by returning this.
    var rtn = this;

    // Apply commands on an element-by-element basis instead of just targeting
    // the whole collection of elements. This lets us initialize each item
    // properly based on its individual data.
    this.each(function() {

      // Provides the singleton data instance that stores persistent state for
      // this plugin.
      var paragraphsCKEditor = $(this).data('paragraphsCKEditor');
      if (!paragraphsCKEditor) {
        var widget_build_id = $(this).attr('data-paragraphs-ckeditor-build-id');
        var field_id = $(this).attr('data-paragraphs-ckeditor-field-id');

        // It only makes sense to build a proper widget manager if the
        // element actually has the required data properties. Otherwise this
        // plugin is probably being applied to an element that doesn't support
        // it.
        if (widget_build_id && field_id) {
          var prototypes = Drupal.paragraphs_ckeditor;
          var commandController = new prototypes.ParagraphCommandController($(this), widget_build_id, field_id);
          var previewFetcher = new prototypes.ParagraphPreviewFetcher(commandController);
          var widgetManager = new prototypes.ParagraphWidgetManager(commandController, previewFetcher);

          paragraphsCKEditor = {
            "commandController": commandController,
            "previewFetcher": previewFetcher,
            "widgetManager": widgetManager,
          };
        }
        else {
          paragraphsCKEditor = {}
        }

        $(this).data('paragraphsCKEditor', paragraphsCKEditor);
      }

      // Process the 'widget-manager' command by returning the widget manager
      // for this element.
      //
      // Note that the behavior of this command is undefined when the collection
      // of elements matching the selector is greater than one.
      if (action == 'widget-manager') {
        rtn = paragraphsCKEditor.widgetManager;
      }

      // Process the 'process-command-response' command.
      else if (action == 'process-command-response') {
        if (options.preview) {
          paragraphsCKEditor.previewFetcher.update(options.preview);
        }
        if (options.widget) {
          paragraphsCKEditor.widgetManager.update(options.widget);
        }
      }
    });

    return rtn;
  };

})(jQuery, window, Drupal, drupalSettings);
