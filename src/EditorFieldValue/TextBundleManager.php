<?php

namespace Drupal\paragraphs_ckeditor\EditorMarkup;

use Drupal\Core\Entity\EntityFieldManagerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\paragraphs\ParagraphInterface;

class TextBundleManager implements TextBundleManagerInterface {

  protected $entityFieldManager;
  protected $storage;
  protected $bundleStorage;

  public function __construct(EntityFieldManagerInterface $entity_field_manager, EntityTypeManagerInterface $entity_type_manager) {
    $this->entityFieldManager = $entity_field_manager;
    $this->storage = $entity_type_manager->getStorage('paragraph');
    $this->bundleStorage = $entity_type_manager->getStorage('paragraphs_type');
  }

  public function createTextAllocator($bundle_name, $bundle_field, $filter_format) {
    return new TextEntityAllocator($this->storage, $bundle_name, $bundle_field, $filter_format);
  }

  public function getBundleTextField($bundle_name) {
    $field_definitions = $this->entityFieldManager->getFieldDefinitions('paragraph', $bundle_name);
    foreach ($field_definitions as $field_definition) {
      if ($this->isTextField($field_definition)) {
        return $field_definition;
      }
    }
    return NULL;
  }

  public function getTextBundles(array $allowed_bundles = array()) {

    if (!$allowed_bundles) {
      foreach ($this->bundleStorage->getQuery()->execute() as $name) {
        $allowed_bundles[$name] = array(
          'label' => $this->bundleStorage->load($name)->label(),
        );
      }
    }

    $bundles = array();
    foreach ($allowed_bundles as $name => $type) {
      if ($this->getBundleTextField($name)) {
        $bundles[$name] = $type['label'];
      }
    }
    return $bundles;
  }

  public function validateTextBundle($bundle_name, $field_name) {
    return TRUE;
  }

  protected function isTextField(FieldDefinitionInterface $field_config) {
    return $field_config->getType() == 'text_long';
  }
}
