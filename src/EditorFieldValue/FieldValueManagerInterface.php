<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList;

/**
 * A service getting information about paragraphs fields.
 */
interface FieldValueManagerInterface {

  /**
   * Gets a list of referenced entities in a paragraphs field.
   *
   * This function static caches loaded revisions. While calling
   * referencedEntities directly on the items worked, it leads to performance
   * problems in certain editor use cases.
   *
   * Drupal core currently does not sttic cache loaded entitiy revisions. This
   * function should be deprecated when https://www.drupal.org/node/2620980
   * is released.
   *
   * @param \Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList $items
   *   The paragraph field items to iterate over.
   *
   * @return \Drupal\paragraphs\ParagraphInterface[]
   *   An array of referenced paragraphs in the field.
   */
  public function getReferencedEntities(EntityReferenceRevisionsFieldItemList $items);

  /**
   * Wraps a paragraphs editor field.
   *
   * @param \Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList $items
   *   The paragraph field items to wrap.
   *
   * @return \Drupal\paragraphs_editor\EditorFieldValue\FieldValueWrapperInterface
   *   The wrapped field.
   */
  public function wrapItems(EntityReferenceRevisionsFieldItemList $items);

  /**
   * Sets the referenced entities on a paragraphs field.
   *
   * @param \Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList $items
   *   The field items to be updated.
   * @param array $entities
   *   The entity values to set on the field items.
   * @param bool $new_revision
   *   Set to true to create a new revision when the items are saved.
   * @param string $langcode
   *   Overrides the language the paragraph will be saved in.
   *
   * @return \Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList
   *   The updated items object.
   */
  public function setItems(EntityReferenceRevisionsFieldItemList $items, array $entities, $new_revision = FALSE, $langcode = NULL);

  /**
   * Gets a list of paragraph types that can store markup.
   *
   * Text bundles are paragraph types that will be used to store the markup when
   * editor content is saved. The first value in a paragraphs editor controlled
   * field is always a text bundle. The remaining entities are referenced by the
   * text bundle.
   *
   * @param array $allowed_bundles
   *   A list of bundles to filter the results by. Leave empty to return all
   *   results.
   */
  public function getTextBundles(array $allowed_bundles = []);

  /**
   * Gets a list of text fields in a bundle that can store editor markup.
   *
   * @param string $bundle_name
   *   The bundle to read text fields from.
   *
   * @see getTextBundles
   *
   * @return string[]
   *   An array of text field names included in the bundle.
   */
  public function getTextFields($bundle_name);

  /**
   * Determines whether a field is a paragraphs field.
   *
   * @param \Drupal\Core\Field\FieldDefinitionInterface $field_definition
   *   The field definition to check against.
   *
   * @return bool
   *   TRUE if it is a paragraphs field, FALSE otherwise.
   */
  public function isParagraphsField(FieldDefinitionInterface $field_definition);

  /**
   * Determines whether a field is an editor-enabled paragraphs field.
   *
   * @param \Drupal\Core\Field\FieldDefinitionInterface $field_definition
   *   The field definition to check against.
   *
   * @return bool
   *   TRUE if it is a paragraphs editor field, FALSE otherwise.
   */
  public function isParagraphsEditorField(FieldDefinitionInterface $field_definition);

  /**
   * Gets the an element definition by name.
   *
   * @param string $element_name
   *   The element name to get the definition for.
   *
   * @return array
   *   The element definition as defined in services.yml.
   */
  public function getElement($element_name);

  /**
   * Gets an element attribute name based on a type.
   *
   * The name of the attribute should be wrapped in '<>' as it appears in
   * services.yml.
   *
   * Example:
   *
   * @code
   * $field_value_manager->getAttributeName('widget', '<context>');
   * @endcode
   *
   * @param string $element_name
   *   The element name to get the attribute name for.
   * @param string $attribute_name
   *   The name of the attribute to get the html name for.
   *
   * @return string
   *   The attribute name.
   */
  public function getAttributeName($element_name, $attribute_name);

  /**
   * Gets a jQuery style attribute selector for an element.
   *
   * Note that this does not look at the selector entry for the element. The
   * selector entry is used by the widget binder library to locate elements.
   * Unfortunately this can cause issues with the back end DOM processor, so we
   * ignore it.
   *
   * Instead, the selector here is built soley from the element tag and
   * attribute names it requires.
   *
   * @param string $element_name
   *   The element name to get the selector for.
   *
   * @return string
   *   The generated selector.
   */
  public function getSelector($element_name);

}
