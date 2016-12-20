/**
 * @file
 * Provides Drupal API integrations for paragraphs_editor.
 */

(function ($, Drupal, drupalSettings) {

  /**
   * jQuery plugin for interacting with paragraphs enabled editor instances.
   */
  $.fn.paragraphsEditor = function(action, options) {

    // Default to supporting call chaining by returning this.
    var rtn = this;

    // Apply commands on an element-by-element basis instead of just targeting
    // the whole collection of elements. This lets us initialize each item
    // properly based on its individual data.
    this.each(function() {

      // Provides the singleton data instance that stores persistent state for
      // this plugin.
      var paragraphsEditor = $(this).data('paragraphsEditor');
      if (!paragraphsEditor) {
        paragraphsEditor = Drupal.paragraphs_editor.loader.wrapElement($(this));
        $(this).data('paragraphsEditor', paragraphsEditor);
      }

      // Process the 'widget-manager' command by returning the widget manager
      // for this element.
      //
      // Note that the behavior of this command is undefined when the collection
      // of elements matching the selector is greater than one.
      if (action == 'attachable') {
        rtn = !!paragraphsEditor;
      }

      else if (action == 'attached') {
        if (paragraphsEditor) {
          rtn = !!paragraphsEditor.widgetManager;
        }
        else {
          rtn = false;
        }
      }

      else if (action == 'attach') {
        rtn = paragraphsEditor ? paragraphsEditor.attach(options) : null;
      }

      else if (action == 'detach') {
        rtn = paragraphsEditor.detach();
      }

      else if (action == 'embed-factory') {
        rtn = paragraphsEditor ? paragraphsEditor.embedCodeFactory : null;
      }

      else if (action == 'context') {
        rtn = paragraphsEditor ? paragraphsEditor.editorContext : null;
      }

      else if (action == 'update') {
        if (paragraphsEditor && paragraphsEditor.widgetTable) {
          paragraphsEditor.widgetTable.update(options);
        }
      }

      else if (action == 'insert') {
      }

      else if (action == 'edit') {
      }

      else if (action == 'get') {
      }

      else if (action == 'remove') {
      }

      else if (action == 'refresh') {
      }

    });

    return rtn;
  };

})(jQuery, Drupal, drupalSettings);
