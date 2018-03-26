<?php

namespace Drupal\paragraphs_editor;

use Drupal\Core\Entity\Display\EntityViewDisplayInterface;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Entity\EntityManagerInterface;
use Drupal\Core\Entity\EntityTypeInterface;
use Drupal\Core\Entity\EntityViewBuilder;
use Drupal\Core\Language\LanguageManagerInterface;
use Drupal\Core\Theme\Registry;
use Drupal\dom_processor\DomProcessor\DomProcessorInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Entity view builder for paragraphs markup entities.
 */
class ParagraphsMarkupEntityViewBuilder extends EntityViewBuilder {

  /**
   * The dom processor service for setting the execution stack frame.
   *
   * @var \Drupal\dom_processor\DomProcessor\DomProcessorInterface
   */
  protected $domProcessor;

  /**
   * Creates a view builder object.
   *
   * @param \Drupal\Core\Entity\EntityTypeInterface $entity_type
   *   The entity type to pass to the parent constructor.
   * @param \Drupal\Core\Entity\EntityManagerInterface $entity_manager
   *   The entity manager to pass to the parent constructor.
   * @param \Drupal\Core\Language\LanguageManagerInterface $language_manager
   *   The language manager to pass to the parent constructor.
   * @param \Drupal\Core\Theme\Registry $theme_registry
   *   The theme registry to pass to the parent constructor.
   * @param \Drupal\dom_processor\DomProcessor\DomProcessorInterface $dom_processor
   *   The dom processor service.
   */
  public function __construct(EntityTypeInterface $entity_type, EntityManagerInterface $entity_manager, LanguageManagerInterface $language_manager, Registry $theme_registry = NULL, DomProcessorInterface $dom_processor) {
    parent::__construct($entity_type, $entity_manager, $language_manager, $theme_registry);
    $this->domProcessor = $dom_processor;
  }

  /**
   * {@inheritdoc}
   */
  public static function createInstance(ContainerInterface $container, EntityTypeInterface $entity_type) {
    return new static(
      $entity_type,
      $container->get('entity.manager'),
      $container->get('language_manager'),
      $container->get('theme.registry'),
      $container->get('dom_processor.dom_processor')
    );
  }

  /**
   * {@inheritdoc}
   */
  protected function alterBuild(array &$build, EntityInterface $entity, EntityViewDisplayInterface $display, $view_mode) {
    // Although we expect 'default' to really be the only view mode since there
    // is no admin UI for configuring additional view modes, we target the
    // 'default' view mode in case other custom view modes are manually created
    // in config.
    if ($view_mode == 'default') {

      // Since the filter has no context as to which field embedded entities
      // come from, we push an execution frame containing that context. Note
      // that without this, saved entities would still render correctly, but
      // preview mode would be broken since the embedded entities won't be found
      // in storage.
      $this->domProcessor->pushExecutionFrame([
        'field' => [
          'items' => $entity->paragraphs,
        ],
      ]);

      $build['content']['markup'] = [
        '#type' => 'processed_text',
        '#text' => $entity->getMarkup(),
        '#format' => $entity->getFormat(),
        '#langcode' => $entity->language()->getId(),
      ];
    }
  }

}
