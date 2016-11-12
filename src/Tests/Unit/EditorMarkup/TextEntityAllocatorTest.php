<?php

namespace Drupal\paragraphs_ckeditor\Tests\Unit\EditorMarkup;

use Drupal\Tests\UnitTestCase;
use Drupal\Component\Uuid;
use Drupal\paragraphs_ckeditor\EditorMarkup\TextEntityAllocator;

/**
 * Tests the paragraphs_ckeditor text entity allocator.
 *
 * @group paragraphs_ckeditor
 * @covers \Drupal\paragraphs_ckeditor\EditorMarkup\TextEntityAllocator
 */
class TextEntityAllocatorTest extends UnitTestCase {

  protected $uuidFactory;

  public function setUp() {
    $this->uuidFactory = new Uuid\Php();
  }

  public function testCreateTextEntity() {
    $allocator = $this->getTextEntityConverter([]);
    $entity = $allocator->allocate('test');

    $this->assertEquals('test', $entity->field_test->value);
    $this->assertEquals('test_bundle', $entity->bundle());
  }

  public function testReuseExistingTextEntity() {
    $existing_entity = $this->createEntity(array(
      'type' => 'test_bundle',
      'field_test' => 'original value',
    ));
    $allocator = $this->getTextEntityConverter([$existing_entity]);
    $entity = $allocator->allocate('test');

    $this->assertEquals('test', $entity->field_test->value);
    $this->assertEquals($existing_entity->uuid(), $entity->uuid());
  }

  public function testNoReuse() {
    $existing_entity = $this->createEntity(array(
      'type' => 'test_bundle',
      'field_test' => 'original value',
    ));
    $allocator = $this->getTextEntityConverter([$existing_entity]);

    $entity = $allocator->allocate('test1');
    $this->assertEquals('test1', $entity->field_test->value);
    $this->assertEquals($existing_entity->uuid(), $entity->uuid());

    $entity = $allocator->allocate('test2');
    $this->assertEquals('test2', $entity->field_test->value);
    $this->assertNotEquals($existing_entity->uuid(), $entity->uuid());
  }

  public function testFreedEntity() {
    $existing_entity = $this->createEntity(array(
      'type' => 'test_bundle',
      'field_test' => 'original value',
    ));
    $allocator = $this->getTextEntityConverter([$existing_entity]);

    $allocator->free($existing_entity);
    $entity = $allocator->allocate('test');
    $this->assertEquals('test', $entity->field_test->value);
    $this->assertNotEquals($existing_entity->uuid(), $entity->uuid());
  }

  public function getTextEntityConverter(array $input_entities) {
    $storage = $this->getMockBuilder('\Drupal\Core\Entity\Sql\SqlContentEntityStorage')
      ->disableOriginalConstructor()
      ->getMock();
    $storage->expects($this->any())
      ->method('create')
      ->will($this->returnCallback(array($this, 'createEntity')));

    return new TextEntityAllocator($storage, $input_entities, 'test_bundle', 'field_test', 'paragraphs_ckeditor');
  }

  public function createEntity(array $values) {
    $entity = $this->getMockBuilder('\Drupal\paragraphs\Entity\Paragraph')
      ->disableOriginalConstructor()
      ->getMock();

    $entity->expects($this->any())
      ->method('uuid')
      ->willReturn($this->uuidFactory->generate());

    $entity->expects($this->any())
      ->method('bundle')
      ->willReturn($values['type']);

    unset($values['type']);
    $values = $values + [
      'field_test' => '',
    ];
    foreach ($values as $key => $value) {
      $item = new \stdClass;
      $item->value = $value;
      $entity->expects($this->any())
        ->method('__get')
        ->with($this->equalTo($key))
        ->willReturn($item);
    }

    return $entity;
  }
}
