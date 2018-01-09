<?php

namespace Drupal\paragraphs_editor\EditorCommand;

use Drupal\Core\Entity\Query\QueryInterface;

/**
 * Represents a filter on bundles that can exist in a field.
 */
interface ParagraphBundleFilterInterface {

  /**
   * Alters an entity query to filter by bundles allowed in the field.
   *
   * @param \Drupal\Core\Entity\Query\QueryInterface $query
   *   The entity query to run.
   */
  public function filterQuery(QueryInterface $query);

  /**
   * Gets the text bundle name in the field.
   *
   * @return string
   *   The text bundle name.
   */
  public function getTextBundle();

  /**
   * Gets a list of paragraph types that can be nested in the field.
   *
   * @return array
   *   An array of paragraph type names that can be nested in the field.
   */
  public function getAllowedBundles();

}
