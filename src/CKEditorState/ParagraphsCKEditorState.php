<?php

namespace Drupal\paragraphs_ckeditor\CKEditorState;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\paragraphs\ParagraphInterface;

class ParagraphsCKEditorState implements ParagraphsCKEditorStateInterface {

  protected $paragraphs;
  protected $allowedBundles;

  public function __construct(array $allowed_bundles) {
    $this->paragraphs = array();
    $this->allowedBundles = $allowed_bundles;
  }

  public function createParagraph(EntityTypeManagerInterface $entity_type_manager, $bundle_name) {
    if (!isset($this->allowedBundles[$bundle_name])) {
      throw new InvalidBundleException($bundle_name);
    }

    $entity = $entity_type_manager->getStorage('paragraphs')->create(array(
      'type' => $bundle_name,
    ));

    $this->storeEntity($entity);
  }

  public function storeParagraph(ParagraphInterface $paragraph) {
    $this->paragraphs[$paragraph->uuid->value] = $paragraph;
  }

  public function getParagraph($uuid) {
    return !empty($this->paragraphs[$uuid]) ? $this->paragraphs[$uuid] : NULL;
  }
}
