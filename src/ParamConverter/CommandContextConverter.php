<?php

namespace Drupal\paragraphs_ckeditor\ParamConverter;

use Drupal\Core\ParamConverter\ParamConverterInterface;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextFactoryInterface;
use Symfony\Component\Routing\Route;

/**
 * Route parameter converter for paragraphs ckeditor command contexts.
 */
class CommandContextConverter implements ParamConverterInterface {

  /**
   * The context factory for creating command contexts.
   *
   * @var \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextFactoryInterface
   */
  protected $contextFactory;

  /**
   * Creates a paragraphs ckeditor command context route parameter converter.
   *
   * @param Drupal\paragraphs_ckeditor\EditorCommand\CommandContextFactoryInterface $context_factory
   *   The context factory to use for creating command contexts.
   */
  public function __construct(CommandContextFactoryInterface $context_factory) {
    $this->contextFactory = $context_factory;
  }

  /**
   * {@inheritdoc}
   */
  public function convert($value, $definition, $name, array $defaults) {
    $context_params = explode(':', $value);
    $entity_type = array_shift($context_params);
    $field_config_id = array_shift($context_params);
    $widget_build_id = array_shift($context_params);
    $entity_id = array_shift($context_params);
    return $this->contextFactory->create($entity_type, $entity_id, $field_config_id, $widget_build_id);
  }

  /**
   * {@inheritdoc}
   */
  public function applies($definition, $name, Route $route) {
    return (!empty($definition['type']) && $definition['type'] == 'paragraphs_ckeditor_command_context');
  }
}
