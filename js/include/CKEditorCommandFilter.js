/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Drupal) {

  'use strict';

  /**
   * Prevents the execution of commands if the selection contains selectors.
   */
  Drupal.paragraphs_ckeditor.CKEditorCommandFilter = function(selectors) {

    /**
     * Applies the filter.
     */
    this.apply = function(evt, selection) {
      if (selection) {
        var ranges = selection.getRanges();
        for (var i in ranges) {
          if (ranges[i].getBoundaryNodes) {
            for (var j in selectors) {
              if (searchBranch(ranges[i], selectors[j])) {
                var undoable = true;
                if (typeof evt.data.command.canUndo !== 'undefined') {
                  undoable = evt.data.command.canUndo;
                }
                if (undoable) {
                  evt.data = null;
                  return false;
                }
              }
            }
          }
        }
        return true;
      }
    };

    /**
     * Helper function for seeing if a selector exists in a DOM tree branch.
     */
    function searchBranch(range, selector) {
      // comman represents the root node of the branch to be searched.
      // boundaries represents the the breadth of the search.
      var common = range.getCommonAncestor().$;
      var boundaries = range.getBoundaryNodes();

      // Get the start and end of the search boundaries.
      var start = boundaries.startNode.$;
      var end = boundaries.endNode.$;

      // Traverse start and end up the tree so they occur at the same level in
      // the tree (this will be level n+1 if common is at level n).
      while (start && start.parentNode !== common) {
        start = start.parentNode;
      }
      while (end && end.parentNode !== common) {
        end = end.parentNode;
      }

      var child;
      var inRange = false;
      for (child = common.firstChild; child; child = child.nextSibling) {
        // We aren't in range until we reach the start node (since the start
        // node may have siblings to the left.)
        if (child === start) {
          inRange = true;
        }

        // If we are within the search reach and find something that matched
        // the selector, we're done.
        if (inRange && $(child).find(selector).length) {
          return true;
        }

        // We reached the end of the branch didn't find anything.
        if (child === end) {
          break;
        }
      }

      return false;
    }
}

})(jQuery, Drupal);
