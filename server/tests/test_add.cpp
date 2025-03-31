#include "add.h"

#include <gtest/gtest.h>

TEST(BasicTest, Addition) {
  EXPECT_EQ(add(2, 2), 4);
  EXPECT_EQ(add(5, 6), 11);
  EXPECT_EQ(add(-1, 1), 0);
}