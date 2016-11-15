/**
 * @file
 * Provides Drupal API integrations for paragraphs_ckeditor.
 */

(function ($, Drupal, drupalSettings) {

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
        var context_string = $(this).attr('data-paragraphs-ckeditor-context');
        var editorSettings = drupalSettings['paragraphs_ckeditor'];

        // It only makes sense to build a proper widget manager if the
        // element actually has the required data properties. Otherwise this
        // plugin is probably being applied to an element that doesn't support
        // it.
        if (context_string && editorSettings[context_string]) {
          var settings = editorSettings[context_string];
          var prototypes = Drupal.paragraphs_ckeditor;
          var commandEmitter = new prototypes.EditorCommandEmitter($(this), context_string, settings);
          var editBuffer = new prototypes.EditBuffer(commandEmitter);
          var widgetManager = new prototypes.WidgetManager(commandEmitter, editBuffer, settings);

          paragraphsCKEditor = {
            "commandEmitter": commandEmitter,
            "editBuffer": editBuffer,
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
        if (options.editBufferItem) {
          paragraphsCKEditor.editBuffer.update(options.editBufferItem);
        }
        if (options.widget) {
          paragraphsCKEditor.widgetManager.update(options.widget);
        }
      }
    });

    return rtn;
  };

})(jQuery, Drupal, drupalSettings);
