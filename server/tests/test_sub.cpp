#include "sub.h"

#include <gtest/gtest.h>

TEST(BasicTest, Subtraction) {
  EXPECT_EQ(sub(2, 2), 0);
  EXPECT_EQ(sub(5, 6), -1);
  EXPECT_EQ(sub(-1, 1), -2);
}