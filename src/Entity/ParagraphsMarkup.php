<?php

namespace Drupal\paragraphs_editor\Entity;

use Drupal\Core\Entity\EntityStorageInterface;
use Drupal\Core\Field\BaseFieldDefinition;
use Drupal\Core\Entity\ContentEntityBase;
use Drupal\Core\Entity\EntityTypeInterface;
use Drupal\Core\Field\FieldStorageDefinitionInterface;
use Drupal\Core\TypedData\TranslatableInterface;
use Drupal\entity_reference_revisions\EntityNeedsSaveInterface;
use Drupal\entity_reference_revisions\EntityNeedsSaveTrait;
use Drupal\paragraphs\Entity\Paragraph;
use Drupal\paragraphs_editor\ParagraphsMarkupInterface;
use Drupal\user\UserInterface;

/**
 * Defines the Paragraph entity.
 *
 * @ContentEntityType(
 *   id = "paragraphs_markup",
 *   label = @Translation("Paragraphs Markup"),
 *   handlers = {
 *     "view_builder" = "Drupal\paragraphs_editor\ParagraphsMarkupEntityViewBuilder",
 *     "access" = "Drupal\paragraphs\ParagraphAccessControlHandler",
 *     "storage_schema" = "Drupal\Core\Entity\SqlContentEntityStorageSchema",
 *     "form" = {
 *       "default" = "Drupal\Core\Entity\ContentEntityForm",
 *       "delete" = "Drupal\Core\Entity\ContentEntityDeleteForm",
 *       "edit" = "Drupal\Core\Entity\ContentEntityForm"
 *     },
 *     "views_data" = "Drupal\views\EntityViewsData",
 *   },
 *   base_table = "paragraphs_markup_item",
 *   data_table = "paragraphs_markup_item_field_data",
 *   revision_table = "paragraphs_markup_item_revision",
 *   revision_data_table = "paragraphs_markup_item_revision_field_data",
 *   translatable = TRUE,
 *   entity_revision_parent_type_field = "parent_type",
 *   entity_revision_parent_id_field = "parent_id",
 *   entity_revision_parent_field_name_field = "parent_field_name",
 *   entity_keys = {
 *     "id" = "id",
 *     "uuid" = "uuid",
 *     "langcode" = "langcode",
 *     "revision" = "revision_id"
 *   },
 *   common_reference_revisions_target = TRUE,
 *   content_translation_ui_skip = TRUE,
 *   render_cache = FALSE,
 *   default_reference_revision_settings = {
 *     "field_storage_config" = {
 *       "cardinality" = 1,
 *       "settings" = {
 *         "target_type" = "paragraphs_markup"
 *       }
 *     },
 *     "field_config" = {
 *       "settings" = {
 *         "handler" = "default:paragraphs_markup"
 *       }
 *     },
 *     "entity_form_display" = {
 *       "type" = "entity_reference_paragraphs_editor"
 *     },
 *     "entity_view_display" = {
 *       "type" = "entity_reference_revisions_entity_view"
 *     }
 *   }
 * )
 */
class ParagraphsMarkup extends ContentEntityBase implements EntityNeedsSaveInterface, ParagraphsMarkupInterface {

  use EntityNeedsSaveTrait;

  /**
   * {@inheritdoc}
   */
  public function getParentEntity() {
    if (!isset($this->get('parent_type')->value) || !isset($this->get('parent_id')->value)) {
      return NULL;
    }

    $parent = \Drupal::entityTypeManager()->getStorage($this->get('parent_type')->value)->load($this->get('parent_id')->value);

    // Return current translation of parent entity, if it exists.
    if ($parent != NULL && ($parent instanceof TranslatableInterface) && $parent->hasTranslation($this->language()->getId())) {
      return $parent->getTranslation($this->language()->getId());
    }

    return $parent;
  }

  /**
   * {@inheritdoc}
   */
  public function label() {
    $label = '';
    if ($parent = $this->getParentEntity()) {
      $parent_field = $this->get('parent_field_name')->value;
      $values = $parent->{$parent_field};
      foreach ($values as $key => $value) {
        if ($value->entity->id() == $this->id()) {
          $label = $parent->label() . ' > ' . $value->getFieldDefinition()->getLabel();
        }
      }
    }
    return $label;
  }

  /**
   * {@inheritdoc}
   */
  public function preSave(EntityStorageInterface $storage) {
    parent::preSave($storage);

    // If no owner has been set explicitly, make the current user the owner.
    if (!$this->getOwner()) {
      $this->setOwnerId(\Drupal::currentUser()->id());
    }
    // If no revision author has been set explicitly, make the node owner the
    // revision author.
    if (!$this->getRevisionAuthor()) {
      $this->setRevisionAuthorId($this->getOwnerId());
    }
  }

  /**
   * {@inheritdoc}
   */
  public function postSave(EntityStorageInterface $storage, $update = TRUE) {
    $this->setNeedsSave(FALSE);
    parent::postSave($storage, $update);
  }

  /**
   * {@inheritdoc}
   */
  public function getRevisionAuthor() {
    return $this->get('revision_uid')->entity;
  }

  /**
   * {@inheritdoc}
   */
  public function setRevisionAuthorId($uid) {
    $this->set('revision_uid', $uid);
    return $this;
  }

  /**
   * {@inheritdoc}
   */
  public function getRevisionLog() {
    return '';
  }

  /**
   * {@inheritdoc}
   */
  public function setRevisionLog($revision_log) {
    return $this;
  }

  /**
   * {@inheritdoc}
   */
  public function getCreatedTime() {
    return $this->get('created')->value;
  }

  /**
   * {@inheritdoc}
   */
  public function getOwner() {
    return $this->get('uid')->entity;
  }

  /**
   * {@inheritdoc}
   */
  public function getOwnerId() {
    return $this->get('uid')->target_id;
  }

  /**
   * {@inheritdoc}
   */
  public function setOwnerId($uid) {
    $this->set('uid', $uid);
    return $this;
  }

  /**
   * {@inheritdoc}
   */
  public function setOwner(UserInterface $account) {
    $this->set('uid', $account->id());
    return $this;
  }

  /**
   * {@inheritdoc}
   */
  public function getMarkup() {
    return $this->markup->value;
  }

  /**
   * {@inheritdoc}
   */
  public function getFormat() {
    return $this->markup->format;
  }

  /**
   * {@inheritdoc}
   */
  public function setMarkup($markup) {
    $this->markup->value = $markup;
  }

  /**
   * {@inheritdoc}
   */
  public function setFormat($format) {
    $this->markup->format = $format;
  }

  /**
   * {@inheritdoc}
   */
  public static function baseFieldDefinitions(EntityTypeInterface $entity_type) {
    $allowed_fields = [
      'id',
      'uuid',
      'revision_id',
      'langcode',
      'uid',
      'status',
      'created',
      'revision_uid',
      'parent_id',
      'parent_type',
      'parent_field_name',
    ];

    $fields = Paragraph::baseFieldDefinitions($entity_type);
    $fields = array_intersect_key($fields, array_flip($allowed_fields));

    $fields['markup'] = BaseFieldDefinition::create('text_with_summary')
      ->setLabel(t('Markup'))
      ->setDescription(t('The markup that can contain references to paragraphs.'))
      ->setRevisionable(TRUE)
      ->setTranslatable(TRUE);

    $fields['paragraphs'] = BaseFieldDefinition::create('entity_reference_revisions')
      ->setLabel(t('Referenced Paragraphs'))
      ->setDescription(t('The set of paragraphs referenced in the markup.'))
      ->setCardinality(FieldStorageDefinitionInterface::CARDINALITY_UNLIMITED)
      ->setSetting('target_type', 'paragraph')
      ->setRevisionable(TRUE)
      ->setTranslatable(FALSE);

    return $fields;
  }

}
